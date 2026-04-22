"""농약 검색/매칭용 모델."""

from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PesticideProduct(Base):
    """`rag_pesticide_documents` 읽기 모델 (RAG 검색용)."""

    __tablename__ = "rag_pesticide_documents"

    document_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("rag_pesticide_product_applications.application_id"),
        nullable=False
    )
    
    crop_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    target_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    
    brand_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    corporation_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingredient_or_formulation_name: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    
    application_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_timing: Mapped[str | None] = mapped_column(Text, nullable=True)
    dilution_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_use_count_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    formulation_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 실제 상세 정보 테이블과 연결 (필요 시)
    details: Mapped["PesticideApplication"] = relationship(back_populates="document_entry")


class PesticideApplication(Base):
    """`rag_pesticide_product_applications` (실제 농약 등록 정보 원본)."""
    
    __tablename__ = "rag_pesticide_product_applications"

    application_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # RAG 테이블에는 요약되어 있지만 여기엔 풀 텍스트가 있을 확률이 높음
    application_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_timing: Mapped[str | None] = mapped_column(Text, nullable=True)
    dilution_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_use_count_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    document_entry: Mapped["PesticideProduct"] = relationship(back_populates="details")
