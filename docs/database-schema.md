# FarmOS Database Schema

## 데이터베이스 정보

| 항목 | 값 |
|------|-----|
| DBMS | PostgreSQL 18 |
| 데이터베이스명 | farmos |
| 접속 | postgres:root@localhost:5432 |
| ORM | SQLAlchemy 2.0 (async) |
| 드라이버 | asyncpg |

---

## 저장소 구분

| 영역 | 저장 방식 | 사유 |
|------|----------|------|
| 사용자 인증 | **PostgreSQL** | 영속 데이터 |
| IoT 센서 | **인메모리** (deque) | 실시간 시연용, 재시작 시 초기화 |

---

## 테이블: `users`

> 모델 파일: `backend/app/models/user.py`

| 설명 | Python Field | SQL Type |
| --- | --- | --- |
| 이름 | name | VARCHAR(10) (사람이름) |
| 아이디 | id | VARCHAR(10) (clover0309) |
| 비밀번호 | password | VARCHAR(255) (password111) Bcrypt 해싱처리 |
| 이메일 | email | EMAIL (clover0309@github.com) |
| 지역 | location | VARCHAR(10) (경기도 안산시) |
| 면적 | area | FLOAT (33.2) |
| 농장이름 | farmname | VARCHAR(40) (김사과 사과농장) |
| 프로필사진 | profile | VARCHAR(255) (s3.amazon.com/dfjkalsdjkasdlfl) |
| 계정 생성 날짜 | create_at | DATE (2026/04/01) |
| 상태 | status | INT (1) (0 탈퇴, 1 정상) |

### 시딩 데이터

| user_id | name | phone | email | password | farm_name | region |
|---------|------|-------|-------|----------|-----------|--------|
| farmer01 | 김사과 | 010-1234-5678 | farmer01@farmos.kr | farm1234 | 김사과 사과농장 | 경북 영주시 |
| parkpear | 박배나무 | 010-9876-5432 | parkpear@farmos.kr | pear5678 | 박씨네 배 과수원 | 충남 천안시 |

---

## 인메모리 저장소 (IoT 전용)

> 파일: `backend/app/core/store.py` — 서버 재시작 시 초기화

| 저장소 | 자료구조 | 최대 크기 | 설명 |
|--------|---------|----------|------|
| `sensor_readings` | `deque` | 2,000건 | 센서 데이터 (FIFO) |
| `irrigation_events` | `list` | 무제한 | 관개 이벤트 |
| `sensor_alerts` | `list` | 무제한 | 센서 알림 |
