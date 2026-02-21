"""Policy model."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Policy(Base):
    """Policy table."""

    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    version = Column(Integer, nullable=False, server_default="1")
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    extracted_text = Column(Text, nullable=True)  # full policy text for RAG

    # One-to-many: one Policy has many Rules
    rules = relationship(
        "Rule",
        back_populates="policy",
        cascade="all, delete-orphan",
    )
