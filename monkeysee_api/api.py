from __future__ import annotations
from typing import cast

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import (
    Executable,
    Function,
    Select,
    Selectable,
    TextClause,
    func as text,
)
from sqlmodel import Session, SQLModel, func, select

from .database import get_session, init_db
from .models import Prediction, PredictionCreate, PredictionRead


def _dump_model(model: SQLModel) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=True)
    return model.dict(exclude_unset=True)


app = FastAPI(
    title="MonkeySee API",
    version="0.1.0",
    description="Backend service that powers the MonkeySee prediction playground.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/predictions",
    status_code=status.HTTP_201_CREATED,
    response_model=PredictionRead,
    tags=["predictions"],
)
def create_prediction(
    payload: PredictionCreate,
    session: Session = Depends(get_session),
) -> Prediction:
    prediction = Prediction(**_dump_model(payload))
    session.add(prediction)
    session.commit()
    session.refresh(prediction)
    return prediction


class PredictionSummary(SQLModel):
    total: int
    open: int
    resolved: int
    archived: int


@app.get(
    "/predictions/summary",
    response_model=PredictionSummary,
    tags=["predictions"],
)
def prediction_summary(session: Session = Depends(get_session)) -> PredictionSummary:
    total = session.exec(select(func.count()).select_from(Prediction)).one()
    counts = session.exec(
        select(Prediction.status, func.count()).group_by(Prediction.status)
    ).all()
    bucket = {"open": 0, "resolved": 0, "archived": 0}
    for status_value, count in counts:
        if status_value in bucket:
            bucket[status_value] = count
    return PredictionSummary(
        total=total,
        open=bucket["open"],
        resolved=bucket["resolved"],
        archived=bucket["archived"],
    )


class PredictionCountBySecond(SQLModel):
    datetime: str  # ISO format datetime string for the hour
    count: int


@app.get(
    "/predictions/stats",
    response_model=list[PredictionCountBySecond],
    tags=["predictions"],
)
def prediction_stats(
    session: Session = Depends(get_session),
) -> list[PredictionCountBySecond]:
    # Group predictions by hour using SQLite datetime functions
    # Use raw SQL for SQLite compatibility
    table_name = Prediction.__tablename__
    assert isinstance(table_name, str)
    table = SQLModel.metadata.tables[table_name]

    query = (
        select(
            func.strftime("%Y-%m-%d %H:%M:%S", table.c.created_at).label("datetime"),
            func.count().label("count"),
        )
        .group_by(func.strftime("%Y-%m-%d %H:%M:%S", table.c.created_at))
        .order_by("datetime")
    )

    results = session.exec(query).all()

    return [PredictionCountBySecond(datetime=row[0], count=row[1]) for row in results]


@app.get(
    "/predictions",
    response_model=list[Prediction],
    tags=["predictions"],
)
def get_predictions(session: Session = Depends(get_session)) -> list[Prediction]:
    statement = select(Prediction).order_by(Prediction.created_at)  # type: ignore[arg-type]
    results = list(session.exec(statement).all())
    for r in results:
        r.author_name = "(REDACTED)"
    return results


@app.get(
    "/predictions/{prediction_id}", response_model=Prediction, tags=["predictions"]
)
def get_prediction(
    prediction_id: int, session: Session = Depends(get_session)
) -> Prediction:
    # Use SQLModel ORM to fetch the prediction by primary key.
    prediction = session.get(Prediction, prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    prediction.author_name = "(REDACTED)"  # redact author names until 2027
    return prediction


@app.get(
    "/rankings/question",
    response_model=tuple[Prediction, Prediction],
    tags=["rankings"],
)
def get_ranking_question(
    session: Session = Depends(get_session),
) -> tuple[Prediction, Prediction]:
    predictions = get_predictions(session)
    def _elo_key(p: Prediction) -> int:
        return p.elo
    predictions.sort(key= _elo_key)
    return predictions[0], predictions[0]
