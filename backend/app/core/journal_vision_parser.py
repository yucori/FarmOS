"""영농일지 사진 입력용 Vision 파서.

LiteLLM 프록시를 통해 vision-capable 모델(default: gemini-2.5-flash)을 1회
batch 호출하고, STT parser와 동일한 `{entries: [{parsed, confidence}]}` shape으로
반환한다. journal_parser의 헬퍼(_extract_json, _validate_and_clean,
_build_pesticide_hint)를 재사용해 후처리 일관성을 유지한다.
"""

from __future__ import annotations

import base64
from datetime import date

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exif_utils import ExifHint, build_exif_summary
from app.core.journal_parser import (
    PARSED_FIELDS,
    _build_pesticide_hint,
    _extract_json,
    _validate_and_clean,
)
from app.core.pesticide_candidates import build_llm_candidates


# 사용자에게 보여줄 거절 사유는 모든 경로에서 통일.
# LLM이 자체 사유를 보내도 사용자에게는 동일 문구로 표시 (FE 검수가 안전망).
UNIFIED_REJECT_REASON = "사진에서 영농 작업 단서를 찾지 못했습니다."


SYSTEM_PROMPT = """당신은 한국어 영농일지 작성을 돕는 비전 분석기입니다.

입력: 농부가 작업 중에 찍은 사진 1~N장. 사진에는 농약/비료 라벨, 작업 도구,
작물 상태, 병해충 흔적, 필지 전경 등이 포함될 수 있습니다.

출력: **JSON 배열** — 작업 단위로 분리된 entry 객체들의 리스트.

중요한 그룹핑 규칙:
- 같은 시간/장소/작업으로 보이는 사진들은 **하나의 entry**로 합치세요
  (예: 농약 통 + 살포 도구 + 살포 후 작물).
- 명백히 다른 작업이면(예: 사과밭 방제 사진 + 토마토 수확 사진) **각각 별도 entry**.
- 판단이 모호하면 entry 1건으로 합치고 detail에 양쪽 내용을 모두 기술하세요.

각 entry 객체의 필드 (해당 없는 필드는 null):
- work_date: 작업일 (YYYY-MM-DD). EXIF 촬영시각 hint가 있으면 그 날짜 사용,
  없으면 오늘 날짜 사용.
- field_name: 필지 (예: "1번 필지", "하우스 2호"). 사진만으로 추정 어려우면 null.
- crop: 작목 (예: "사과", "고추", "토마토"). 사진에서 명확히 보이면 채움.
- work_stage: 작업단계 (반드시 다음 중 하나):
  사전준비, 경운, 파종, 정식, 작물관리, 수확
  - 농약/비료 살포·방제·전정·봉지 씌우기·적과는 모두 "작물관리"
  - 수확물·따기·캐기는 "수확"
  - 밭 갈기·로타리는 "경운"
- weather: 사진의 빛·하늘 상태로 추정 (맑음/흐림/비). 모호하면 null.
- disease: 병해충명. 잎 변색·반점·해충 등이 명확할 때만.
- usage_pesticide_product: 농약 라벨이 보이면 라벨 텍스트 그대로.
- usage_pesticide_amount: 사용량 표시(병·말통·희석배수)가 보이면.
- usage_fertilizer_product: 비료 라벨.
- usage_fertilizer_amount: 비료 사용량.
- detail: 사진 전반에서 읽힌 작업 내용을 한국어 한 문장으로 요약.

거절 규칙:
- 사진 전체가 영농 작업과 무관(반려동물, 셀카, 음식 등)하면 다음 객체 반환:
  {"rejected": true, "reject_reason": "<짧은 사유>"}
- 영농 단서가 조금이라도 있으면 거절하지 말고 가능한 만큼 채우세요.

환각 방지:
- 라벨이 흐리거나 안 보이면 추측하지 말고 null.
- 농약명을 임의로 만들어내지 마세요. 라벨에 적힌 글자만 그대로 옮기세요.
- 필드 자체에 단서가 없으면 채우지 말고 null.

반드시 JSON만 출력하세요. 설명·마크다운 없이 순수 JSON.
기본 형식은 **배열** [{...}, {...}]. 거절 시에만 객체 반환."""


def _vision_confidence(parsed: dict) -> dict:
    """Vision 결과는 raw_text 매칭이 없으므로 일괄 0.7(medium)로 표기.

    사용자가 미리보기 폼에서 검수하는 단계이므로 정밀 신뢰도보다 "값이 있다/없다"
    표시가 의미 있다.
    """
    return {field: 0.7 for field in PARSED_FIELDS if parsed.get(field) is not None}


def _images_to_data_uris(images: list[bytes]) -> list[str]:
    """원본 bytes → base64 data URI. mime은 jpeg로 통일(FE에서 다운샘플 후 jpeg)."""
    return [
        f"data:image/jpeg;base64,{base64.b64encode(img).decode('ascii')}"
        for img in images
    ]


async def parse_photos(
    images: list[bytes],
    exif_hints: list[ExifHint],
    field_name: str | None = None,
    crop: str | None = None,
    db: AsyncSession | None = None,
) -> dict:
    """사진 bytes 리스트를 LiteLLM vision 모델로 분석해 entries[] 반환.

    Returns:
        {
            "entries": [{"parsed": {...}, "confidence": {...}}],
            "used_exif": bool,
            "rejected": bool,
            "reject_reason": str | None,
        }
    """
    today = date.today().isoformat()
    exif_summary = build_exif_summary(exif_hints)
    used_exif = any(h.has_exif for h in exif_hints)

    # 사용자 메시지 구성: 텍스트 컨텍스트 + image_url N개
    user_content: list[dict] = [
        {
            "type": "text",
            "text": (
                "사진을 분석해 영농일지 entry를 작성해주세요.\n"
                f"오늘 날짜: {today}\n"
                f"현재 선택된 필지: {field_name or '미지정'}\n"
                f"현재 선택된 작목: {crop or '미지정'}\n"
                "\n"
                "사진별 EXIF 메타:\n"
                f"{exif_summary}"
            ),
        }
    ]
    for uri in _images_to_data_uris(images):
        user_content.append({"type": "image_url", "image_url": {"url": uri}})

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # 농약 후보 hint (실패해도 분석은 계속)
    if db is not None:
        try:
            candidates = await build_llm_candidates(db, crop=crop, top_n=80)
            hint = _build_pesticide_hint(candidates)
            if hint:
                messages.append({"role": "system", "content": hint})
        except Exception:
            pass

    messages.append({"role": "user", "content": user_content})

    url = f"{settings.LITELLM_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.LITELLM_API_KEY}"}
    payload = {
        "model": settings.LITELLM_VISION_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=settings.JOURNAL_VISION_TIMEOUT_S) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    data = resp.json()
    response_text = data["choices"][0]["message"]["content"] or ""
    extracted = _extract_json(response_text)

    if extracted is None:
        return {
            "entries": [],
            "unparsed_text": "",
            "used_exif": used_exif,
            "rejected": True,
            "reject_reason": UNIFIED_REJECT_REASON,
        }

    # 거절 케이스: 객체 형태이고 rejected=True
    if isinstance(extracted, dict) and extracted.get("rejected"):
        return {
            "entries": [],
            "unparsed_text": "",
            "used_exif": used_exif,
            "rejected": True,
            "reject_reason": UNIFIED_REJECT_REASON,
        }

    # 객체 하나만 온 경우 배열로 감싸기
    if isinstance(extracted, dict):
        extracted = [extracted]

    if not isinstance(extracted, list):
        return {
            "entries": [],
            "unparsed_text": "",
            "used_exif": used_exif,
            "rejected": True,
            "reject_reason": UNIFIED_REJECT_REASON,
        }

    entries: list[dict] = []
    for item in extracted:
        if not isinstance(item, dict):
            continue
        parsed = _validate_and_clean(item)

        clean_parsed = {
            k: v for k, v in parsed.items() if v is not None and k in PARSED_FIELDS
        }
        if not clean_parsed:
            continue
        entries.append({
            "parsed": clean_parsed,
            "confidence": _vision_confidence(clean_parsed),
        })

    if not entries:
        return {
            "entries": [],
            "unparsed_text": "",
            "used_exif": used_exif,
            "rejected": True,
            "reject_reason": UNIFIED_REJECT_REASON,
        }

    return {
        "entries": entries,
        "unparsed_text": "",
        "used_exif": used_exif,
        "rejected": False,
    }
