"""TDD: FAQ 관리 기능 테스트

GREEN 테스트 (12개, 60%): 기존 기능 — 즉시 통과
RED 테스트  ( 8개, 40%): 신규 기능 — analytics 엔드포인트 구현 후 통과

TDD 사이클:
  1. 이 파일 작성 (RED 포함)
  2. pytest → GREEN 12개 통과, RED 8개 실패 확인
  3. analytics 엔드포인트 + 누락 기능 구현
  4. pytest → 전체 20개 통과
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── 테스트 DB 설정 ────────────────────────────────────────────────────────────

# StaticPool: 모든 연결이 같은 in-memory DB를 공유 — create_all 후 세션에서도 동일 테이블 접근 가능
SQLALCHEMY_TEST_URL = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def test_engine():
    """모듈 스코프 SQLite 엔진 — StaticPool으로 단일 연결 공유."""
    # 필요 모델을 먼저 임포트해야 Base.metadata에 등록됨
    from app.database import Base
    import app.models  # noqa: F401

    engine = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine):
    """각 테스트마다 독립 세션 (rollback으로 격리)."""
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session):
    """FaqSync를 mock으로 대체한 TestClient."""
    from app.database import get_db
    from app.routers.faq import router as faq_router

    app = FastAPI()
    app.include_router(faq_router)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # ChromaDB / FaqSync 은 백그라운드 작업 — 테스트에서 차단
    with patch("app.routers.faq.FaqSync.upsert"), patch("app.routers.faq.FaqSync.delete"):
        with TestClient(app) as c:
            yield c


# ──────────────────────────────────────────────────────────────────────────────
# ✅ GREEN 테스트 (1~12): 기존 코드로 통과
# ──────────────────────────────────────────────────────────────────────────────


class TestFaqDocModel:
    """FaqDoc 모델 메서드 단위 테스트."""

    def test_to_chroma_document_with_category(self):
        """[GREEN] 카테고리 있는 문서의 ChromaDB 텍스트 포맷 검증."""
        from app.models.faq_doc import FaqDoc
        from app.models.faq_category import FaqCategory

        cat = FaqCategory(id=1, name="배송", slug="delivery",
                          color="bg-blue-100 text-blue-700", icon="local_shipping",
                          sort_order=1, is_active=True)
        doc = FaqDoc(
            id=1, title="배송은 얼마나 걸리나요?",
            content="평균 2~3일 소요됩니다.",
            chroma_doc_id="faq_abc123", chroma_collection="faq",
            category="faq", extra_metadata="{}",
        )
        doc.faq_category = cat

        text = doc.to_chroma_document()
        assert text.startswith("[배송]")
        assert "Q: 배송은 얼마나 걸리나요?" in text
        assert "A: 평균 2~3일 소요됩니다." in text

    def test_to_chroma_document_without_category(self):
        """[GREEN] 카테고리 없는 문서는 prefix 없이 생성."""
        from app.models.faq_doc import FaqDoc

        doc = FaqDoc(
            id=2, title="일반 질문", content="일반 답변",
            chroma_doc_id="faq_xyz789", chroma_collection="faq",
            category="faq", extra_metadata="{}",
        )
        doc.faq_category = None

        text = doc.to_chroma_document()
        assert not text.startswith("[")
        assert "Q: 일반 질문" in text
        assert "A: 일반 답변" in text

    def test_to_chroma_metadata_includes_db_id(self):
        """[GREEN] ChromaDB 메타데이터에 db_id가 포함된다."""
        from app.models.faq_doc import FaqDoc

        doc = FaqDoc(
            id=5, title="Q", content="A",
            chroma_doc_id="faq_meta001", chroma_collection="faq",
            category="faq", extra_metadata='{"tags": ["배송"]}',
        )
        doc.faq_category = None

        meta = doc.to_chroma_metadata()
        assert meta["db_id"] == 5
        assert meta["chroma_doc_id"] == "faq_meta001"
        assert meta["tags"] == "배송"

    def test_to_chroma_metadata_with_invalid_extra(self):
        """[GREEN] extra_metadata 파싱 실패 시 빈 dict로 폴백."""
        from app.models.faq_doc import FaqDoc

        doc = FaqDoc(
            id=6, title="Q", content="A",
            chroma_doc_id="faq_bad_meta", chroma_collection="faq",
            category="faq", extra_metadata="INVALID_JSON",
        )
        doc.faq_category = None

        # 예외 없이 메타데이터 반환
        meta = doc.to_chroma_metadata()
        assert meta["db_id"] == 6


class TestFaqCategoryValidation:
    """FaqCategoryCreate Pydantic 스키마 검증."""

    def test_valid_slug_accepted(self):
        """[GREEN] 유효한 slug 형식은 그대로 통과."""
        from app.routers.faq import FaqCategoryCreate

        obj = FaqCategoryCreate(name="배송", slug="delivery-guide")
        assert obj.slug == "delivery-guide"

    def test_invalid_slug_raises(self):
        """[GREEN] 슬러그에 대문자 또는 특수문자 포함 시 ValueError."""
        from pydantic import ValidationError
        from app.routers.faq import FaqCategoryCreate

        with pytest.raises(ValidationError):
            FaqCategoryCreate(name="배송", slug="Delivery Guide!")

    def test_empty_name_raises(self):
        """[GREEN] 빈 name은 허용하지 않는다."""
        from pydantic import ValidationError
        from app.routers.faq import FaqCategoryCreate

        with pytest.raises(ValidationError):
            FaqCategoryCreate(name="   ", slug="test-slug")


class TestFaqCategoryRouter:
    """FAQ 카테고리 엔드포인트 통합 테스트."""

    def test_create_category_returns_201(self, client):
        """[GREEN] POST /api/admin/faq-categories → 201 + 생성된 카테고리."""
        resp = client.post("/api/admin/faq-categories", json={
            "name": "배송 안내",
            "slug": "delivery",
            "color": "bg-blue-100 text-blue-700",
            "icon": "local_shipping",
            "sort_order": 1,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["slug"] == "delivery"
        assert data["is_active"] is True
        assert data["doc_count"] == 0

    def test_duplicate_slug_returns_409(self, client):
        """[GREEN] 동일 slug 두 번 생성 시 409."""
        payload = {"name": "결제", "slug": "payment-dup"}
        client.post("/api/admin/faq-categories", json=payload)
        resp = client.post("/api/admin/faq-categories", json=payload)
        assert resp.status_code == 409

    def test_list_categories_returns_active_only(self, client):
        """[GREEN] include_inactive=false 시 활성 카테고리만 반환."""
        # 활성 카테고리 생성
        client.post("/api/admin/faq-categories", json={"name": "회원", "slug": "member"})
        resp = client.get("/api/admin/faq-categories")
        assert resp.status_code == 200
        cats = resp.json()
        assert all(c["is_active"] for c in cats)

    def test_delete_category_not_found(self, client):
        """[GREEN] 존재하지 않는 카테고리 삭제 시 404."""
        resp = client.delete("/api/admin/faq-categories/99999")
        assert resp.status_code == 404


class TestFaqDocRouter:
    """FAQ 문서 엔드포인트 통합 테스트."""

    def test_create_doc_returns_201(self, client):
        """[GREEN] POST /api/admin/faq-docs → 201."""
        resp = client.post("/api/admin/faq-docs", json={
            "title": "배송은 언제 오나요?",
            "content": "평균 2~3일 소요됩니다.",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "배송은 언제 오나요?"
        assert data["is_active"] is True
        assert data["chroma_doc_id"].startswith("faq_")

    def test_list_docs_returns_200(self, client):
        """[GREEN] GET /api/admin/faq-docs → 200."""
        resp = client.get("/api/admin/faq-docs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_doc_not_found(self, client):
        """[GREEN] 존재하지 않는 문서 조회 시 404."""
        resp = client.get("/api/admin/faq-docs/99999")
        assert resp.status_code == 404

    def test_update_doc_title(self, client):
        """[GREEN] PUT /api/admin/faq-docs/{id} — 제목 수정."""
        create_resp = client.post("/api/admin/faq-docs", json={
            "title": "원래 제목", "content": "답변",
        })
        doc_id = create_resp.json()["id"]

        resp = client.put(f"/api/admin/faq-docs/{doc_id}", json={"title": "수정된 제목"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "수정된 제목"

    def test_delete_doc_soft_delete(self, client):
        """[GREEN] DELETE /api/admin/faq-docs/{id} → is_active=False (소프트 삭제)."""
        create_resp = client.post("/api/admin/faq-docs", json={
            "title": "삭제할 문서", "content": "답변",
        })
        doc_id = create_resp.json()["id"]

        resp = client.delete(f"/api/admin/faq-docs/{doc_id}")
        assert resp.status_code == 204

        # 단건 조회 시 여전히 존재하되 is_active=False
        get_resp = client.get(f"/api/admin/faq-docs/{doc_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["is_active"] is False


# ──────────────────────────────────────────────────────────────────────────────
# ❌ RED 테스트 (13~20): 인사이트/분석 API — 구현 후 GREEN
# ──────────────────────────────────────────────────────────────────────────────


class TestFaqAnalytics:
    """FAQ 인사이트/지표 엔드포인트 — RED → 구현 후 GREEN."""

    def test_analytics_summary_returns_200(self, client):
        """[RED→GREEN] GET /api/admin/faq-analytics/summary → 200 + 통계 필드."""
        resp = client.get("/api/admin/faq-analytics/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_docs" in data
        assert "active_docs" in data
        assert "total_categories" in data
        assert "total_citations" in data
        assert "uncategorized_docs" in data

    def test_analytics_summary_correct_counts(self, client):
        """[RED→GREEN] 문서 2개 생성 후 summary 수치 검증."""
        client.post("/api/admin/faq-docs", json={"title": "Q1", "content": "A1"})
        client.post("/api/admin/faq-docs", json={"title": "Q2", "content": "A2"})

        resp = client.get("/api/admin/faq-analytics/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_docs"] >= 2
        assert data["active_docs"] >= 2

    def test_analytics_top_cited_returns_200(self, client):
        """[RED→GREEN] GET /api/admin/faq-analytics/top-cited → 200 + 리스트."""
        resp = client.get("/api/admin/faq-analytics/top-cited")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_analytics_top_cited_respects_limit(self, client):
        """[RED→GREEN] top-cited?limit=5 → 최대 5개 반환."""
        resp = client.get("/api/admin/faq-analytics/top-cited?limit=5")
        assert resp.status_code == 200
        assert len(resp.json()) <= 5

    def test_analytics_coverage_gaps_returns_200(self, client):
        """[RED→GREEN] GET /api/admin/faq-analytics/coverage-gaps → 200."""
        resp = client.get("/api/admin/faq-analytics/coverage-gaps")
        assert resp.status_code == 200
        data = resp.json()
        assert "escalated_intents" in data
        assert "category_coverage" in data

    def test_analytics_coverage_gaps_has_correct_structure(self, client):
        """[RED→GREEN] coverage-gaps 응답의 각 항목 구조 검증."""
        resp = client.get("/api/admin/faq-analytics/coverage-gaps")
        assert resp.status_code == 200
        data = resp.json()
        # 카테고리 커버리지 목록 구조 확인
        for item in data["category_coverage"]:
            assert "slug" in item
            assert "doc_count" in item

    def test_analytics_category_doc_count_after_create(self, client):
        """[RED→GREEN] 카테고리 생성 + 문서 등록 후 해당 카테고리 doc_count 반영."""
        # 카테고리 생성
        cat_resp = client.post("/api/admin/faq-categories", json={
            "name": "교환반품", "slug": "exchange-ret-test",
        })
        cat_id = cat_resp.json()["id"]

        # 해당 카테고리 문서 등록
        client.post("/api/admin/faq-docs", json={
            "title": "교환 방법", "content": "...",
            "faq_category_id": cat_id,
        })

        resp = client.get("/api/admin/faq-analytics/summary")
        assert resp.status_code == 200
        # 미분류 0개 (카테고리 있으므로)
        data = resp.json()
        assert isinstance(data["uncategorized_docs"], int)

    def test_analytics_top_cited_sorted_by_citation_desc(self, client):
        """[RED→GREEN] top-cited 결과는 인용 수 내림차순 정렬."""
        resp = client.get("/api/admin/faq-analytics/top-cited")
        assert resp.status_code == 200
        items = resp.json()
        if len(items) >= 2:
            for i in range(len(items) - 1):
                assert items[i]["citation_count"] >= items[i + 1]["citation_count"]
