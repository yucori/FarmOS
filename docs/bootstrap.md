# Bootstrap 쉬운 안내서

## 한 줄 요약

팀원은 루트의 `Web_Starter.exe`를 실행하면 됩니다. 이 실행기는 서버를 띄우기 전에 자동화 점검을 수행해 DB/시드 상태를 맞춘 뒤 FarmOS와 쇼핑몰 서버를 시작합니다.

## 팀원용 실행 순서

1. PostgreSQL을 실행합니다.
2. `backend/.env`, `shopping_mall/backend/.env`가 현재 PC의 PostgreSQL 접속 정보와 맞는지 확인합니다.
3. 루트의 `Web_Starter.exe`를 실행합니다.
4. 서버 시작 버튼을 누릅니다.

자동화가 정상 종료되면 아래 주소를 사용할 수 있습니다.

- FarmOS 백엔드: `http://localhost:8000`
- FarmOS 프론트엔드: `http://localhost:5173`
- 쇼핑몰 백엔드: `http://localhost:4000`
- 쇼핑몰 프론트엔드: `http://localhost:5174`

## Web Starter가 자동으로 하는 일

- PostgreSQL 접속과 대상 DB 존재 여부 확인
- SQLAlchemy 모델 기준 테이블/컬럼/row 수 검증
- 테이블이 없으면 `bootstrap/create_tables.py` 실행
- 데이터가 부족하면 `bootstrap/insert_data.py` 실행
- 쇼핑몰 FAQ DB 시딩과 RAG 인덱싱
- 기존 DB에 `shop_tickets.flags` 컬럼이 없으면 안전하게 추가
- 쇼핑몰 상품 이미지 URL을 최신 품목별 외부 이미지 매핑으로 보정

## 쇼핑몰 변경사항만 수동 반영

서버는 이미 세팅되어 있고 쇼핑몰 후속 보강만 다시 적용하고 싶다면 루트에서 실행합니다.

```bash
python bootstrap/apply_shop_updates.py
```

현재 후속 보강 항목:

- `shopping_mall/backend/scripts/update_product_images.py` 매핑 기준으로 `shop_products.thumbnail`, `shop_products.images` 갱신

## 문제가 생겼을 때

- `psql 실행 파일을 찾을 수 없습니다`
  - PostgreSQL `bin` 경로를 PATH에 추가합니다.
- `데이터베이스 "farmos" 가 존재하지 않습니다`
  - PostgreSQL에 DB를 생성하거나 `.env`/Web Starter DB 설정의 DB 이름을 맞춥니다.
- `PostgreSQL 비밀번호가 잘못됐습니다`
  - `.env` 또는 Web Starter 설정의 사용자/비밀번호를 확인합니다.
- ChromaDB 디렉터리 삭제 실패
  - 쇼핑몰 백엔드가 이미 켜져 있으면 종료 후 다시 실행합니다.

## 수동 서버 실행

Web Starter를 쓰지 않을 때만 아래 명령을 각각 실행합니다.

```bash
cd backend && uv run uvicorn main:app --reload
cd frontend && npm install && npm run dev
cd shopping_mall/backend && uv run uvicorn main:app --reload --port 4000
cd shopping_mall/frontend && npm install && npm run dev
```
