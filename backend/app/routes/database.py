"""Database connection API routes."""

import logging

from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppSettings
from app.services.external_db import create_external_engine_from_credentials, get_external_engine

router = APIRouter(prefix="/database", tags=["database"])
logger = logging.getLogger(__name__)

EXTERNAL_DB_PORT = 5432
_KEYS = ("external_db_host", "external_db_port", "external_db_user", "external_db_name")


def _save_connection_settings(db: Session, host: str, port: int, user: str, db_name: str) -> None:
    """Persist connection details (not password) so the UI can pre-fill and show status."""
    for key, value in [
        ("external_db_host", host),
        ("external_db_port", str(port)),
        ("external_db_user", user),
        ("external_db_name", db_name),
    ]:
        row = db.query(AppSettings).filter(AppSettings.key == key).first()
        if row:
            row.value = value
        else:
            db.add(AppSettings(key=key, value=value))
    db.commit()


def _get_connection_settings(db: Session) -> dict:
    """Return saved host, port, user, db_name from AppSettings."""
    rows = db.query(AppSettings).filter(AppSettings.key.in_(_KEYS)).all()
    return {r.key: r.value for r in rows}


@router.get("/status")
def database_status(db: Session = Depends(get_db)) -> dict:
    """
    Return whether the external database is currently connected and last-used connection details.
    Used to pre-fill the connection form and show "Connected to host / db_name" after page reload.
    """
    engine = get_external_engine()
    saved = _get_connection_settings(db)
    return {
        "connected": engine is not None,
        "host": saved.get("external_db_host"),
        "db_name": saved.get("external_db_name"),
        "username": saved.get("external_db_user"),
        "port": saved.get("external_db_port"),
    }


class DatabaseConnectRequest(BaseModel):
    """Request body for POST /database/connect."""

    host: str
    username: str
    password: str
    db_name: str


@router.post("/connect")
def database_connect(body: DatabaseConnectRequest, db: Session = Depends(get_db)) -> dict:
    """
    Connect to an external database using the provided credentials.
    Stores the engine in memory and saves host/username/db_name (not password) for status and pre-fill.
    """
    try:
        create_external_engine_from_credentials(
            host=body.host,
            port=EXTERNAL_DB_PORT,
            user=body.username,
            password=body.password,
            database=body.db_name,
        )
    except Exception as e:
        logger.error(
            "Database connection failed | host=%s | db_name=%s | error=%s",
            body.host,
            body.db_name,
            str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to connect to database: {e}",
        ) from e
    _save_connection_settings(db, body.host, EXTERNAL_DB_PORT, body.username, body.db_name)
    logger.info(
        "Database connected | host=%s | db_name=%s | user=%s",
        body.host,
        body.db_name,
        body.username,
    )
    return {"message": "Connected successfully"}
