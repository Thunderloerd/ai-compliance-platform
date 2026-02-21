"""
Search the company (external) database for policy content relevant to a user question.
Used by Ask policy: we query the company DB, then send results to Groq for the answer.
Flow: user question -> search company DB -> Groq answers from that content -> output to user.
"""

import logging
import re
from typing import Any

from sqlalchemy import text

from app.config import settings
from app.services.external_db import get_external_engine

logger = logging.getLogger(__name__)


def _safe_identifier(name: str) -> str:
    """Allow only alphanumeric and underscore to prevent SQL injection."""
    if not name or not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
        raise ValueError(f"Invalid identifier: {name!r}")
    return name


def search_company_policy_db(query: str, limit: int | None = None) -> list[dict[str, Any]]:
    """
    Search the company database policy table for rows relevant to the user question.
    Uses parameterized ILIKE on the content column (and optional title). Safe against injection.

    Returns:
        List of dicts with keys: content, title (if configured), id (if present).
        Empty list if external DB not connected, table missing, or no matches.
    """
    engine = get_external_engine()
    if engine is None:
        logger.debug("Company policy search skipped: no external database connected.")
        return []

    if not getattr(settings, "USE_COMPANY_DB_FOR_ASK", True):
        return []

    table = _safe_identifier(getattr(settings, "COMPANY_POLICY_TABLE", "policy_documents") or "policy_documents")
    content_col = _safe_identifier(getattr(settings, "COMPANY_POLICY_CONTENT_COLUMN", "content") or "content")
    title_col_raw = (getattr(settings, "COMPANY_POLICY_TITLE_COLUMN", None) or "").strip()
    title_col = _safe_identifier(title_col_raw) if title_col_raw else ""
    limit_val = limit if limit is not None else getattr(settings, "COMPANY_POLICY_SEARCH_LIMIT", 10)
    limit_val = max(1, min(limit_val, 50))

    # Build SELECT: content column required; optional title and id
    cols = [content_col]
    if title_col:
        cols.append(title_col)
    cols.append("id")
    select_cols = ", ".join(f'"{c}"' for c in cols)

    # Search: use OR so different questions match different rows; order by relevance (match count) so the best-matching content is first
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "when", "where", "how", "why", "do", "does", "must", "can", "should", "to", "of", "in", "on", "for", "with", "it", "be", "this", "that"}
    words = [w.strip().lower() for w in (query or "").split() if w.strip() and w.strip().lower() not in stop_words][:10]
    if not words:
        # No search terms: return first limit rows by id
        sql = f'SELECT {select_cols} FROM "{table}" ORDER BY id LIMIT :limit'
        params: dict[str, Any] = {"limit": limit_val}
    else:
        # WHERE (content ILIKE :w0 OR content ILIKE :w1 OR ...) ORDER BY relevance (number of matches) DESC
        or_conditions = " OR ".join(f'"{content_col}" ILIKE :w{i}' for i in range(len(words)))
        # Relevance: count how many of the words appear in content (higher = more relevant)
        relevance_expr = " + ".join(f"CASE WHEN \"{content_col}\" ILIKE :w{i} THEN 1 ELSE 0 END" for i in range(len(words)))
        sql = f'SELECT {select_cols}, ({relevance_expr}) AS _rel FROM "{table}" WHERE ({or_conditions}) ORDER BY _rel DESC, id LIMIT :limit'
        params = {f"w{i}": f"%{words[i]}%" for i in range(len(words))}
        params["limit"] = limit_val

    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql), params).fetchall()
    except Exception as e:
        logger.warning("Company policy search failed: %s", e)
        return []

    out = []
    for row in rows:
        if hasattr(row, "_mapping"):
            row_dict = dict(row._mapping)
        else:
            # row may include _rel; only use first len(cols) for content/title/id
            row_dict = dict(zip(cols, row[: len(cols)]))
        out.append({
            "content": row_dict.get(content_col) or "",
            "title": row_dict.get(title_col) if title_col else None,
            "id": row_dict.get("id"),
        })
    return out
