from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine


def _sqlite_file_path() -> str:
    default_path = os.path.join(os.path.dirname(__file__), "monkeysee.db")
    return os.getenv("DATABASE_URL", f"sqlite:///{default_path}")


DATABASE_URL = _sqlite_file_path()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def init_db() -> None:
    """Create database tables if they don't exist yet."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


