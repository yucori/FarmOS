import json
import logging
from pathlib import Path

from _bootstrap_common import psql_query, info

ROOT = Path(__file__).resolve().parent.parent
NCPMS_JSON_PATH = ROOT / "tools" / "ncpms-api-crawler" / "json_raw" / "ncpms_data.json"

async def run_ncpms_seed(db_conf: dict[str, str]):
    info("NCPMS 캐시 테이블 적재 스크립트 실행")
    if not NCPMS_JSON_PATH.exists():
        info(f"NCPMS 데이터 파일 없음: {NCPMS_JSON_PATH} (의도적 스킵 가능)")
        return

    with open(NCPMS_JSON_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not items:
        info("빈 JSON 파일 - 스킵")
        return

    try:
        count_str = psql_query(db_conf, "SELECT COUNT(*) FROM ncpms_diagnoses;")
        current_count = int(count_str.strip()) if count_str else 0
        if current_count >= len(items):
            info(f"NCPMS 데이터가 이미 로드되어 있습니다. (DB {current_count}건 / JSON {len(items)}건) - 중복 적재를 스킵합니다.")
            return
        elif current_count > 0:
            info(f"NCPMS 데이터가 일부 로드되어 있습니다. ({current_count}건). 중단된 위치부터 병합(UPSERT)을 재개합니다.")
    except Exception:
        pass

    query_parts = []
    
    for row in items:
        pest = str(row.get("pest_name", "")).replace("'", "''")
        crop = str(row.get("crop_name", "")).replace("'", "''")
        eco = str(row.get("ecologyInfo", "")).replace("'", "''")
        bio = str(row.get("biologyPrvnbeMth", "")).replace("'", "''")
        chem = str(row.get("chemicalPrvnbeMth", "")).replace("'", "''")
        prev = str(row.get("preventMethod", "")).replace("'", "''")
        
        md_text = f"### 생태 환경\n\n{eco}\n\n### 작물 보호 및 재배적 방제\n\n{prev}"
        md_text = md_text.replace("'", "''")

        val = f"('{pest}', '{crop}', '{eco}', '{bio}', '{chem}', '{prev}', '{md_text}')"
        query_parts.append(val)

    if query_parts:
        import asyncio
        from app.core.database import async_session
        from sqlalchemy import text
        
        all_vals = ",\n".join(query_parts)
        query = f"""
        INSERT INTO ncpms_diagnoses (pest_name, crop_name, ecology_info, biology_prvnbe_mth, chemical_prvnbe_mth, prevent_method, formatted_markdown)
        VALUES
        {all_vals}
        ON CONFLICT (pest_name, crop_name) DO UPDATE SET
            ecology_info = EXCLUDED.ecology_info,
            biology_prvnbe_mth = EXCLUDED.biology_prvnbe_mth,
            chemical_prvnbe_mth = EXCLUDED.chemical_prvnbe_mth,
            prevent_method = EXCLUDED.prevent_method,
            formatted_markdown = EXCLUDED.formatted_markdown;
        """
        async def insert_data():
            async with async_session() as db:
                await db.execute(text(query))
                await db.commit()
                
        await insert_data()
        info(f"NCPMS 데이터 적재 완료 (총 {len(query_parts)}건)")
        info(f"NCPMS 데이터 적재 완료 (총 {len(query_parts)}건)")
