"""JSON 지식 파일 → PostgreSQL FaqDoc 테이블 마이그레이션 스크립트.

기존 ai/data/*.json 파일의 내용을 shop_faq_docs 테이블로 이관합니다.
이 스크립트는 최초 1회만 실행하세요. 중복 실행은 upsert 방식으로 처리됩니다.

실행:
    cd shopping_mall/backend
    uv run python scripts/migrate_knowledge_to_db.py

완료 후:
    - app/routers/knowledge.py 어드민 API로 내용을 관리하세요.
    - seed_rag.py의 seed_from_db()로 ChromaDB를 재시딩할 수 있습니다.

참고: 이 스크립트는 FAQ v1 마이그레이션입니다.
      v2 통합 FAQ는 migrate_json_to_faq_v2.py를 사용하세요.
"""
import json
import os
import sys

# shopping_mall/backend를 path에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.faq_doc import FaqDoc, CATEGORY_TO_COLLECTION
from app.paths import AI_DATA_DIR


def _load_json(filename: str) -> list:
    path = str(AI_DATA_DIR / filename)
    if not os.path.exists(path):
        print(f"  [건너뜀] 파일 없음: {path}")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _upsert_doc(
    db,
    *,
    category: str,
    chroma_doc_id: str,
    title: str,
    content: str,
    extra_metadata: dict,
) -> tuple[FaqDoc, bool]:
    """(doc, created) 반환 — 이미 존재하면 내용을 업데이트합니다."""
    existing = db.query(FaqDoc).filter(
        FaqDoc.chroma_doc_id == chroma_doc_id
    ).first()

    if existing:
        existing.title = title
        existing.content = content
        existing.extra_metadata = json.dumps(extra_metadata, ensure_ascii=False)
        existing.is_active = True
        return existing, False

    doc = FaqDoc(
        category=category,
        chroma_collection=CATEGORY_TO_COLLECTION[category],
        chroma_doc_id=chroma_doc_id,
        title=title,
        content=content,
        extra_metadata=json.dumps(extra_metadata, ensure_ascii=False),
        is_active=True,
    )
    db.add(doc)
    return doc, True


# ── FAQ ──────────────────────────────────────────────────────────────────────

def migrate_faq(db) -> int:
    data = _load_json("faq.json")
    count = 0
    for item in data:
        _, created = _upsert_doc(
            db,
            category="faq",
            chroma_doc_id=item["id"],
            title=item["question"],
            content=item["answer"],
            extra_metadata={"intent": item.get("intent", "")},
        )
        count += 1
        marker = "생성" if created else "업데이트"
        print(f"  [{marker}] faq: {item['id']}")
    return count


# ── 보관 가이드 ───────────────────────────────────────────────────────────────

def migrate_storage_guide(db) -> int:
    data = _load_json("storage_guide.json")
    count = 0
    for item in data:
        _, created = _upsert_doc(
            db,
            category="storage_guide",
            chroma_doc_id=item["id"],
            title=item["product"],
            content=item["guide"],
            extra_metadata={
                "product_name": item["product"],
                "category": item.get("category", ""),
            },
        )
        count += 1
        marker = "생성" if created else "업데이트"
        print(f"  [{marker}] storage_guide: {item['id']}")
    return count


# ── 제철 정보 ─────────────────────────────────────────────────────────────────

def migrate_season_info(db) -> int:
    data = _load_json("season_info.json")
    count = 0
    for item in data:
        _, created = _upsert_doc(
            db,
            category="season_info",
            chroma_doc_id=item["id"],
            title=item["season"],
            content=item["description"],
            extra_metadata={
                "season": item["season"],
                "products": item.get("products", []),
            },
        )
        count += 1
        marker = "생성" if created else "업데이트"
        print(f"  [{marker}] season_info: {item['id']}")
    return count


# ── 농장 정보 ─────────────────────────────────────────────────────────────────

def migrate_farm_info(db) -> int:
    data = _load_json("farm_info.json")
    count = 0
    for item in data:
        _, created = _upsert_doc(
            db,
            category="farm_info",
            chroma_doc_id=item["id"],
            title=item["title"],
            content=item["content"],
            extra_metadata={"category": item.get("category", "")},
        )
        count += 1
        marker = "생성" if created else "업데이트"
        print(f"  [{marker}] farm_info: {item['id']}")
    return count


# ── 진입점 ────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== KnowledgeDoc 마이그레이션 시작 ===\n")

    db = SessionLocal()
    try:
        print("[1/4] FAQ 마이그레이션")
        faq_count = migrate_faq(db)

        print(f"\n[2/4] 보관 가이드 마이그레이션")
        storage_count = migrate_storage_guide(db)

        print(f"\n[3/4] 제철 정보 마이그레이션")
        season_count = migrate_season_info(db)

        print(f"\n[4/4] 농장 정보 마이그레이션")
        farm_count = migrate_farm_info(db)

        db.commit()
        total = faq_count + storage_count + season_count + farm_count
        print(f"\n=== 완료: 총 {total}건 ===")
        print(f"  faq: {faq_count}건")
        print(f"  storage_guide: {storage_count}건")
        print(f"  season_info: {season_count}건")
        print(f"  farm_info: {farm_count}건")
        print(
            "\n다음 단계:\n"
            "  1) uv run python ai/seed_rag.py --from-db  로 ChromaDB 재시딩\n"
            "  2) 이후부터는 /api/admin/knowledge API로 내용을 관리하세요."
        )
    except Exception as e:
        db.rollback()
        print(f"\n[오류] 롤백: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
