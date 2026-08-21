"""
ECoR-OAMS  ·  Database Engine & Session Management
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import DATABASE_URL


# ── Engine ────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite
    echo=False,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, connection_record):
    """Enable WAL journal and foreign-key enforcement for every connection."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ── Session factory ──────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Declarative Base ─────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency ───────────────────────────────────────────
def get_db():
    """FastAPI dependency that yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Bootstrap ────────────────────────────────────────────
def init_db():
    """Create all tables defined by ORM models and drop obsolete OTP tables."""
    from . import models  # noqa: F401  — import triggers table registration
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS otp_sessions"))
        conn.execute(text("DROP TABLE IF EXISTS \"auth.OTP_Sessions\""))
        conn.execute(text("DROP TABLE IF EXISTS \"OTP_Sessions\""))
        conn.commit()
    Base.metadata.create_all(bind=engine)
