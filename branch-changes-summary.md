# 브랜치 변경 요약

| 기준 브랜치 | 대상 브랜치 | 작성일 |
|-------------|-------------|--------|
| `dev` | `feature/faq-knowledge-base` · `feature/chatbot-improvements` | 2026-04-28 |

---

## 신규 기능

---

### 1. CS FAQ 지식베이스 시스템

> 기존에 JSON 파일로 관리하던 FAQ 문서를 DB 기반으로 전환하고, 어드민에서 직접 관리할 수 있도록 구축한 시스템

#### 구성 요소

| 구성 | 파일 | 설명 |
|------|------|------|
| DB 모델 | `models/faq_doc.py` | FAQ 문서 (`shop_faq_docs`) — ChromaDB 동기화의 단일 소스 |
| DB 모델 | `models/faq_category.py` | FAQ 카테고리 (`shop_faq_categories`) — 색상·아이콘 포함 |
| 동기화 서비스 | `services/faq_sync.py` | PostgreSQL → ChromaDB 자동 동기화, BM25 재빌드 (30초 디바운스) |
| API | `routers/faq.py` | 카테고리·문서 CRUD, 활성화 토글, ChromaDB 동기화 상태 확인 |
| 어드민 UI | `FaqPage.tsx` | 카테고리·문서 관리 페이지 |
| 마이그레이션 | `scripts/migrate_json_to_faq_v2.py` | 기존 JSON → DB 일괄 이전 + ChromaDB 재시딩 |

#### 동작 방식

```
어드민에서 FAQ 문서 생성/수정/삭제
          │
          ▼
   PostgreSQL (shop_faq_docs)        ← 단일 소스
          │  BackgroundTask
          ▼
      ChromaDB "faq"                 ← 파생 검색 인덱스
          │
          ▼
      BM25 인덱스 재빌드 (30초 디바운스)
```

---

### 2. FAQ 인용 추적 (FaqCitation)

> 챗봇이 어떤 FAQ 문서를 실제로 참조했는지 기록하는 기능

| 구성 | 파일 | 설명 |
|------|------|------|
| DB 모델 | `models/faq_citation.py` | 인용 기록 (`shop_faq_citations`) — `(chat_log_id, faq_doc_id)` |
| 인용 수집 | `agent/cs_tools.py` | `CSToolContext` — `search_faq` 호출 시 인용 FAQ ID 수집 |
| 인용 저장 | `services/multi_agent_chatbot.py` | `AgentResult` → `FaqCitation` 레코드 저장 |

#### 파이프라인

```
search_faq 도구 호출
      │
      ▼
CSToolContext.add_cited(faq_doc_id)
      │
      ▼
AgentResult.cited_faq_ids
      │
      ▼
MultiAgentChatbotService._save_faq_citations()
      │
      ▼
shop_faq_citations INSERT
```

---

### 3. 주문 처리 자동화 서비스 (OrderProcessor)

> 재고 복구·자동 취소 로직을 캡슐화한 서비스. OrderGraph와 CS 에이전트 양쪽에서 공유

**파일:** `services/order_processor.py`

| 메서드 | 동작 |
|--------|------|
| `restore_stock` | 주문 품목 재고 복구. 행 레벨 잠금(`with_for_update`)으로 동시성 제어. `stock > 0`이면 `is_available` 자동 `True` 전환 |
| `apply_auto_cancel` | `pending` · `preparing` 상태 → 즉시 자동 취소. `shipped` 이후 → 관리자 검토 티켓 생성 |

---

### 4. CS 에이전트 신규 도구

> 기존 CS 에이전트가 정보 조회만 가능했던 것에서, 주문 처리 액션까지 수행할 수 있도록 확장

| 도구 | 역할 |
|------|------|
| `cancel_order` | 주문 상태에 따라 자동 취소 또는 관리자 검토 티켓 생성 |
| `process_refund` | 환불 방법 선택 및 처리 |

---

### 5. RAG 평가 스크립트

**파일:** `scripts/evaluate_rag.py`

| 항목 | 내용 |
|------|------|
| 측정 대상 | `search_faq`, `search_policy` (프로덕션 함수 직접 호출) |
| 측정 지표 | Hit Rate@k / Mean Latency / P95 Latency |
| 실행 옵션 | `--no-rerank`, `--export results.json`, `--verbose` |

---

## 개선 사항

---

### 1. Supervisor 에이전트 라우팅 개선

| 개선 항목 | 내용 |
|-----------|------|
| **Order Fastpath** | "취소해줘", "교환신청" 등 명확한 접수 구문 → Supervisor LLM 생략, OrderGraph 직행 |
| **진행 중 플로우 우선 처리** | OrderGraph가 `interrupt` 상태일 때 다음 메시지는 LLM 판단 없이 OrderGraph로 전달 |
| **의도 불일치 감지** | 취소 플로우 진행 중 "교환하고 싶어" 입력 시 기존 플로우 폐기 → 신규 플로우 시작 |
| **CS 단독 pass-through** | CS 에이전트만 호출된 경우 Supervisor 재합성 LLM 생략 → LLM 호출 1회 절감 |

---

### 2. ChromaDB 컬렉션 통합

| 변경 전 | 변경 후 |
|---------|---------|
| `storage_guide`, `season_info`, `farm_intro`, `faq` 4개 컬렉션 | `faq` 단일 컬렉션 |
| RAG 도구 4개 (`search_faq`, `search_storage_guide`, `search_season_info`, `search_farm_info`) | `search_faq(query, subcategory)` 1개 |

- `subcategory` 미지정 시 전체 컬렉션 검색
- 결과 없으면 전체 fallback 재검색

---

### 3. OrderGraph 안정성 개선

| 개선 항목 | 내용 |
|-----------|------|
| **N+1 쿼리 방지** | `_build_order_summaries` 도입 — 주문별 개별 DB 왕복 → 2번의 IN 쿼리로 대체 |
| **중복 티켓 방지** | `create_ticket` 멱등성 체크 — 동일 조건 티켓 존재 시 재사용 |
| **무한 루프 방지** | `show_summary` 재진입 3회 초과 시 `abort=True` 강제 탈출 |

---

### 4. 어드민 TicketsPage 필터 개선

```
대분류 (action_type)            소분류 (status)
[ 전체 | 취소 | 교환 ]  ──▶  [ 전체 | 접수 | 처리중 | 완료 | 취소 ]

대분류 변경 시 소분류는 "all"로 자동 초기화
```

---

### 5. 기타 개선

| 항목 | 내용 |
|------|------|
| `datetime_utils.py` | `now_kst()` 추가, 전체 `datetime.utcnow()` → KST 통일 |
| 주문 상태 코드 정규화 | `registered` → `preparing`, `shipping` → `shipped` 등 비표준 값 제거 |
| `migrate_order_status.py` | 기존 DB의 비표준 status 값 일괄 정규화 스크립트 |

---

## TODO 제안

### 🔴 높음

| # | 항목 | 배경 |
|---|------|------|
| 1 | **주문 자동 취소 스케줄러 연동** | `OrderProcessor.apply_auto_cancel` 구현 완료, APScheduler 잡 등록만 남음 |
| 2 | **FaqCitation 집계 어드민 UI** | 인용 데이터가 쌓이고 있으나 활용 화면 없음. FAQ Top N, 인용 횟수 컬럼 등 |
| 3 | **OrderGraph interrupt 타임아웃 처리** | 대화 중단 시 플로우가 영구 방치됨. 24시간 후 자동 abort + 체크포인트 정리 필요 |

### 🟡 중간

| # | 항목 | 배경 |
|---|------|------|
| 4 | **evaluate_rag.py CI 통합** | 현재 수동 실행. FAQ 대량 변경·모델 교체 시 Hit Rate 회귀 자동 감지 필요 |
| 5 | **cancel_order 도구 확인 단계 추가** | LLM이 확인 없이 직접 호출 가능한 구조. 프롬프트 지시 또는 OrderGraph 위임 강제 검토 |
| 6 | **재고 임계값 어드민 UI** | `is_available` 자동 전환 임계값이 하드코딩. 상품별 설정·모니터링 UI 필요 |

### 🟢 장기

| # | 항목 | 배경 |
|---|------|------|
| 7 | **BM25 점진적 업데이트** | FAQ 증가 시 전체 재빌드 시간 증가. 추가/삭제 문서만 반영하는 방식 도입 검토 |
| 8 | **다중 세션 동시 처리 검증** | 같은 유저가 두 탭에서 동시에 취소 플로우 진행하는 엣지 케이스 통합 테스트 부재 |
| 9 | **FAQ 문서 버전 관리** | 수정 이력 테이블 추가 → 이전 버전 롤백 가능 |
| 10 | **챗봇 응답 품질 피드백 루프** | Thumbs up/down → FaqCitation 데이터와 결합 → 품질 낮은 FAQ 자동 플래그 파이프라인 |
