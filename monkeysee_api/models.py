from __future__ import annotations

from datetime import datetime
from datetime import timezone
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel


def _default_prediction_status() -> str:
    return "open"


class PredictionBase(SQLModel):
    content: str = Field(
        max_length=600,
        description="Text describing the prediction in natural language.",
    )
    author_name: str = Field(
        description="Friendly display name synced from Google sign-in.",
    )
    elo: int = Field(
        default=800,
        ge=0,
        le=5000,
        description="The ELO rating of this prediction, approximately corresponds to how likely it is",
    )

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @field_validator("author_name")
    @classmethod
    def normalize_author(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else value


class Prediction(PredictionBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    status: str = Field(default_factory=_default_prediction_status, index=True)
    outcome: Optional[str] = Field(
        default=None,
        description="Optional free-form outcome description entered when resolving.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"open", "resolved", "archived"}
        if value not in allowed:
            raise ValueError(f"Status must be one of {', '.join(sorted(allowed))}")
        return value


class PredictionCreate(PredictionBase):
    pass


class PredictionRead(PredictionBase):
    id: int
    status: str
    outcome: Optional[str]
    created_at: datetime
    updated_at: datetime


class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    prediction_id_a: int = Field(index=True)
    prediction_id_b: int = Field(index=True)

    askee: str = Field(index=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    answered: bool = Field(default=False)
    winner_prediction_id: int | None = None
