"""Policy-related API routes."""

import asyncio
import logging
import os
import queue
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AppSettings, AuditLog, Notification, Policy, Rule, User
from app.schemas.rule_data import validate_rule_data
from app.services.pdf_service import PDFExtractionError, extract_text_from_pdf
from app.services.policy_compare import compare_policies
from app.routes.auth_routes import get_current_user
from app.services.rag_service import (
    get_indexed_count,
    get_rag_status,
    index_policy_chunks,
    retrieve,
    sanitize_query,
    trim_chunks_to_token_budget,
)
from app.services.rag_service import delete_policy_from_index
from app.services.rule_extractor import RuleExtractionError, extract_rules_from_text, _fallback_rules_from_text
from app.services.company_policy_search import search_company_policy_db

router = APIRouter(prefix="/policy", tags=["policy"])
logger = logging.getLogger(__name__)

# Upload: run RAG index + rule extraction in parallel with this timeout (seconds)
UPLOAD_PROCESS_TIMEOUT = 120

_rag_ask_timestamps: dict[int, list[float]] = {}
RAG_ASK_WINDOW_SEC = 3600


class PolicyAskRequest(BaseModel):
    """Request body for Ask policy (RAG Q&A)."""
    query: str
    policy_id: int | None = None


def _rag_ask_rate_limit_check(user_id: int) -> None:
    """Raise HTTPException 429 if user exceeded RAG Ask rate limit in the last hour."""
    limit = getattr(settings, "RAG_ASK_RATE_LIMIT_PER_HOUR", 60)
    if limit <= 0:
        return
    now_sec = time.time()
    cutoff = now_sec - RAG_ASK_WINDOW_SEC
    if user_id not in _rag_ask_timestamps:
        _rag_ask_timestamps[user_id] = []
    _rag_ask_timestamps[user_id] = [t for t in _rag_ask_timestamps[user_id] if t > cutoff]
    if len(_rag_ask_timestamps[user_id]) >= limit:
        logger.warning("RAG Ask rate limit exceeded | user_id=%s | limit=%s", user_id, limit)
        raise HTTPException(
            status_code=429,
            detail=f"Too many Ask policy requests in the last hour (limit: {limit}). Try again later.",
        )
    _rag_ask_timestamps[user_id].append(now_sec)

# Defaults when AppSettings key is missing (env override optional)
DEFAULT_MAX_FILE_SIZE_MB = int(os.environ.get("POLICY_UPLOAD_MAX_FILE_SIZE_MB", "10"))
DEFAULT_MAX_UPLOADS_PER_HOUR = int(os.environ.get("POLICY_UPLOAD_MAX_PER_HOUR", "30"))

CHUNK_SIZE = 1024 * 1024  # 1 MB for streaming read


def _get_int_setting(db: Session, key: str, default: int) -> int:
    """Get integer setting from AppSettings by key, or default if missing/invalid."""
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if not row or not row.value:
        return default
    try:
        return int(row.value.strip())
    except ValueError:
        return default


def _rule_to_response(rule: Rule) -> dict:
    """Serialize a Rule model to a JSON-suitable dict."""
    return {
        "id": rule.id,
        "policy_id": rule.policy_id,
        "rule_data": rule.rule_data,
        "severity": rule.severity,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
    }


@router.get("/compare")
def policy_compare(
    old_policy_id: int = Query(..., description="Policy ID for old version"),
    new_policy_id: int = Query(..., description="Policy ID for new version"),
    compute_impact: bool = Query(True, description="Compute new violations count if DB connected"),
    db: Session = Depends(get_db),
) -> dict:
    """Compare two policy versions: rule diff (only in old, only in new, in both) and optional impact count."""
    try:
        return compare_policies(db, old_policy_id, new_policy_id, compute_impact=compute_impact)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


# Max chars of policy text to send to LLM when RAG index is empty (fallback answer from raw text)
ASK_FALLBACK_MAX_CHARS = 12_000

SYSTEM_PROMPT_RAG = """You are a policy compliance assistant.

You must answer using ONLY the provided policy excerpts.

Rules:
1. Do NOT use prior knowledge.
2. Do NOT infer missing details.
3. If the excerpts do not explicitly contain the answer,
   respond exactly with:
   "Not found in the provided documents."
4. When the answer contains a specific numeric limit, rule, or restriction,
   return the exact sentence verbatim from the excerpts.
   Do not rephrase it.
5. If an exact sentence cannot be located,
   respond exactly:
   "Exact sentence not found in excerpts."
"""
SYSTEM_PROMPT_FALLBACK = """You are a policy compliance assistant.

You must answer using ONLY the provided policy text.

Rules:
1. Do NOT use prior knowledge.
2. Do NOT infer missing details.
3. If the text does not explicitly contain the answer,
   respond exactly with:
   "Not found in the provided documents."
4. When the answer contains a specific numeric limit, rule, or restriction,
   return the exact sentence verbatim from the text.
5. If an exact sentence cannot be located,
   respond exactly:
   "Exact sentence not found in excerpts."
"""
SYSTEM_PROMPT_COMPANY_DB = """You are a policy compliance assistant.
You must answer using ONLY the provided policy content from the company database.
Rules:
1. Answer ONLY the specific question the user asked. Do not give a generic or repeated answer for different questions.
2. Do NOT use prior knowledge. If the content does not contain the answer, respond exactly: "Not found in the provided policy content."
3. When the answer contains a specific number, limit, or rule, state it clearly and concisely for that question.
"""


def _do_ask_sync(
    cleaned: str,
    policy_id: int | None,
    fallback_policies: list[dict],
    use_summaries_only: bool = False,
) -> tuple[str, list[dict] | None, float, float, int, int | None]:
    """
    Sync helper: first try company DB (policy content from external DB), then Groq.
    If no company DB content, fall back to Chroma RAG or policy text.
    Returns (answer_text, chunks_used or None, retrieval_time_ms, llm_time_ms, tokens_sent, tokens_returned).
    Run via asyncio.to_thread.
    """
    from app.services.llm_client import get_completion_client, get_completion_model
    from app.services import rag_cache
    from app.services.rag_service import count_tokens

    t0 = time.perf_counter()
    # Flow: user question -> search company DB for policy content -> Groq answers from that -> output
    use_company_db = getattr(settings, "USE_COMPANY_DB_FOR_ASK", True)
    if use_company_db:
        limit = getattr(settings, "COMPANY_POLICY_SEARCH_LIMIT", 10)
        company_results = search_company_policy_db(cleaned, limit=limit)
        context_parts = []
        for r in company_results:
            content = (r.get("content") or "").strip()
            if content:
                title = r.get("title")
                if title:
                    context_parts.append(f"[{title}]\n{content}")
                else:
                    context_parts.append(content)
        context = "\n\n---\n\n".join(context_parts).strip()
        if context:
            retrieval_ms = (time.perf_counter() - t0) * 1000.0
            user_content = f"""Policy content from company database:\n\n{context}\n\nUser question: {cleaned}\n\nAnswer (based only on the policy content above):"""
            tokens_sent = count_tokens(SYSTEM_PROMPT_COMPANY_DB) + count_tokens(user_content)
            try:
                t1 = time.perf_counter()
                client = get_completion_client()
                max_tokens = getattr(settings, "RAG_ASK_MAX_TOKENS", 500)
                temperature = getattr(settings, "RAG_ASK_TEMPERATURE", 0.2)
                response = client.chat.completions.create(
                    model=get_completion_model(),
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT_COMPANY_DB},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                llm_ms = (time.perf_counter() - t1) * 1000.0
                answer = (response.choices[0].message.content or "").strip() if response.choices else ""
                usage = getattr(response, "usage", None)
                tokens_returned = int(usage.completion_tokens) if usage and hasattr(usage, "completion_tokens") else None
                if answer:
                    from app.services import rag_metrics
                    rag_metrics.record(retrieval_time_ms=retrieval_ms, llm_time_ms=llm_ms, total_latency_ms=(time.perf_counter() - t0) * 1000.0, tokens_sent=tokens_sent, tokens_returned=tokens_returned)
                    return (answer, None, retrieval_ms, llm_ms, tokens_sent, tokens_returned)
            except Exception as e:
                logger.warning("Ask (company DB) LLM call failed: %s", e)
            # If LLM failed, fall through to Chroma/fallback
        # If company DB search has no matches, continue to Chroma RAG / policy-text fallback.

    top_k = getattr(settings, "RAG_TOP_K", 5)
    chunks = rag_cache.get_cached_chunks(cleaned, policy_id)
    if chunks is None:
        chunks = retrieve(cleaned, top_k=top_k, policy_id=policy_id, use_summaries_only=use_summaries_only)
    retrieval_ms = (time.perf_counter() - t0) * 1000.0
    excerpts_text = ""
    if chunks:
        max_ctx = getattr(settings, "RAG_ASK_MAX_CONTEXT_TOKENS", 4096)
        content_prefix = "Policy excerpts:\n\n"
        content_suffix = f"\n\nUser question: {cleaned}\n\nAnswer (based only on the policy excerpts above):"
        excerpts_text = trim_chunks_to_token_budget(
            chunks, SYSTEM_PROMPT_RAG, content_prefix, content_suffix, max_context_tokens=max_ctx
        )
    if not excerpts_text or not excerpts_text.strip():
        fallback_text = ""
        if fallback_policies:
            parts = [f"[Policy: {p['name']}]\n{p['text']}" for p in fallback_policies if p.get("text")]
            fallback_text = "\n\n".join(parts).strip()
        if fallback_text:
            max_chars = getattr(settings, "RAG_ASK_FALLBACK_MAX_CHARS", ASK_FALLBACK_MAX_CHARS)
            if len(fallback_text) > max_chars:
                fallback_text = fallback_text[: max_chars - 50] + "\n\n[... truncated ...]"
            user_content = f"""Policy text:\n\n{fallback_text}\n\nUser question: {cleaned}\n\nAnswer (based only on the policy text above):"""
            try:
                t1 = time.perf_counter()
                client = get_completion_client()
                max_tokens = getattr(settings, "RAG_ASK_MAX_TOKENS", 500)
                temperature = getattr(settings, "RAG_ASK_TEMPERATURE", 0.2)
                response = client.chat.completions.create(
                    model=get_completion_model(),
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT_FALLBACK},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                llm_ms = (time.perf_counter() - t1) * 1000.0
                answer = (response.choices[0].message.content or "").strip() if response.choices else ""
                tokens_sent = count_tokens(SYSTEM_PROMPT_FALLBACK) + count_tokens(user_content)
                usage = getattr(response, "usage", None)
                tokens_returned = int(usage.completion_tokens) if usage and hasattr(usage, "completion_tokens") else None
                if answer:
                    total_ms = (time.perf_counter() - t0) * 1000.0
                    from app.services import rag_metrics
                    rag_metrics.record(retrieval_time_ms=retrieval_ms, llm_time_ms=llm_ms, total_latency_ms=total_ms, tokens_sent=tokens_sent, tokens_returned=tokens_returned)
                    return (answer + "\n\n(Answer from policy text; RAG index is still building. For best results, use 'Index existing policies' when ready.)", None, retrieval_ms, llm_ms, tokens_sent, tokens_returned)
            except Exception as e:
                logger.warning("Ask fallback (policy text) LLM call failed: %s", e)
        total_ms = (time.perf_counter() - t0) * 1000.0
        from app.services import rag_metrics
        rag_metrics.record(retrieval_time_ms=retrieval_ms, llm_time_ms=0.0, total_latency_ms=total_ms, tokens_sent=0, tokens_returned=None)
        indexed_count = get_indexed_count()
        if policy_id is not None:
            answer_msg = (
                "No indexed content for the selected policy. "
                "Try 'All policies' to search across all indexed policies, or run 'Index existing policies' again. "
                "If this policy was uploaded before RAG was enabled, re-upload its PDF so it can be indexed."
            )
        elif indexed_count > 0:
            answer_msg = (
                "Search returned no results even though the index has content. "
                "Check that GROQ_API_KEY is set in backend .env and see server logs for 'RAG retrieve failed'."
            )
        else:
            answer_msg = (
                "No policy documents are indexed yet. Upload policy PDFs first (Upload Policy), then try again. "
                "If you already uploaded policies, use 'Index existing policies' above to index them for Q&A."
            )
        return (answer_msg, None, retrieval_ms, 0.0, 0, None)
    user_content = f"""Policy excerpts:\n\n{excerpts_text}\n\nUser question: {cleaned}\n\nAnswer (based only on the policy excerpts above):"""
    tokens_sent = count_tokens(SYSTEM_PROMPT_RAG) + count_tokens(user_content)
    try:
        t1 = time.perf_counter()
        client = get_completion_client()
        max_tokens = getattr(settings, "RAG_ASK_MAX_TOKENS", 500)
        temperature = getattr(settings, "RAG_ASK_TEMPERATURE", 0.2)
        response = client.chat.completions.create(
            model=get_completion_model(),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_RAG},
                {"role": "user", "content": user_content},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        llm_ms = (time.perf_counter() - t1) * 1000.0
        answer = (response.choices[0].message.content or "").strip() if response.choices else ""
        usage = getattr(response, "usage", None)
        tokens_returned = int(usage.completion_tokens) if usage and hasattr(usage, "completion_tokens") else None
    except Exception as e:
        logger.warning("RAG Ask LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to generate answer.") from e
    total_ms = (time.perf_counter() - t0) * 1000.0
    from app.services import rag_metrics
    rag_metrics.record(retrieval_time_ms=retrieval_ms, llm_time_ms=llm_ms, total_latency_ms=total_ms, tokens_sent=tokens_sent, tokens_returned=tokens_returned)
    return (answer or "No answer could be generated.", chunks, retrieval_ms, llm_ms, tokens_sent, tokens_returned)


def _stream_ask_sync_producer(
    cleaned: str,
    policy_id: int | None,
    fallback_policies: list[dict],
    out_queue: queue.Queue[str | None],
    use_summaries_only: bool = False,
) -> None:
    """Run in thread: stream LLM deltas into queue. Puts None when done. Company DB first, then Chroma."""
    from app.services.llm_client import get_completion_client, get_completion_model
    from app.services import rag_cache
    import json

    try:
        use_company_db = getattr(settings, "USE_COMPANY_DB_FOR_ASK", True)
        if use_company_db:
            limit = getattr(settings, "COMPANY_POLICY_SEARCH_LIMIT", 10)
            company_results = search_company_policy_db(cleaned, limit=limit)
            context_parts = []
            for r in company_results:
                content = (r.get("content") or "").strip()
                if content:
                    title = r.get("title")
                    if title:
                        context_parts.append(f"[{title}]\n{content}")
                    else:
                        context_parts.append(content)
            context = "\n\n---\n\n".join(context_parts).strip()
            if context:
                user_content = f"""Policy content from company database:\n\n{context}\n\nUser question: {cleaned}\n\nAnswer (based only on the policy content above):"""
                max_tokens = getattr(settings, "RAG_ASK_MAX_TOKENS", 500)
                temperature = getattr(settings, "RAG_ASK_TEMPERATURE", 0.2)
                client = get_completion_client()
                response = client.chat.completions.create(
                    model=get_completion_model(),
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT_COMPANY_DB},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                )
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        out_queue.put(f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n")
                out_queue.put("data: [DONE]\n\n")
                out_queue.put(None)
                return
            # If company DB search has no matches, continue to Chroma RAG / policy-text fallback.

        top_k = getattr(settings, "RAG_TOP_K", 5)
        chunks = rag_cache.get_cached_chunks(cleaned, policy_id)
        if chunks is None:
            chunks = retrieve(cleaned, top_k=top_k, policy_id=policy_id, use_summaries_only=use_summaries_only)
        excerpts_text = ""
        if chunks:
            max_ctx = getattr(settings, "RAG_ASK_MAX_CONTEXT_TOKENS", 4096)
            content_prefix = "Policy excerpts:\n\n"
            content_suffix = f"\n\nUser question: {cleaned}\n\nAnswer (based only on the policy excerpts above):"
            excerpts_text = trim_chunks_to_token_budget(
                chunks, SYSTEM_PROMPT_RAG, content_prefix, content_suffix, max_context_tokens=max_ctx
            )
        if not excerpts_text or not excerpts_text.strip():
            answer, _ = _do_ask_sync(cleaned, policy_id, fallback_policies)
            out_queue.put(f"data: {json.dumps({'content': answer})}\n\n")
            out_queue.put("data: [DONE]\n\n")
            out_queue.put(None)
            return
        user_content = f"""Policy excerpts:\n\n{excerpts_text}\n\nUser question: {cleaned}\n\nAnswer (based only on the policy excerpts above):"""
        max_tokens = getattr(settings, "RAG_ASK_MAX_TOKENS", 500)
        temperature = getattr(settings, "RAG_ASK_TEMPERATURE", 0.2)
        client = get_completion_client()
        response = client.chat.completions.create(
            model=get_completion_model(),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_RAG},
                {"role": "user", "content": user_content},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                out_queue.put(f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n")
        out_queue.put("data: [DONE]\n\n")
    except Exception as e:
        logger.warning("RAG Ask stream failed: %s", e)
        out_queue.put(f"data: {json.dumps({'error': str(e)})}\n\n")
    finally:
        out_queue.put(None)


@router.post("/ask", response_model=None)
async def policy_ask(
    body: PolicyAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    stream: bool = Query(False, description="Stream response as SSE"),
) -> dict | StreamingResponse:
    """
    Ask a natural-language question about compliance policy.
    Flow: user question -> search company DB for policy content -> Groq answers from that -> output.
    When USE_COMPANY_DB_FOR_ASK is True (default), policy content is read from the company (external)
    database table (COMPANY_POLICY_TABLE / COMPANY_POLICY_CONTENT_COLUMN). If no company DB or no results,
    falls back to Chroma RAG or policy extracted_text. Response and chunks are cached. Set stream=true for SSE.
    """
    max_len = getattr(settings, "RAG_ASK_MAX_QUERY_LENGTH", 500)
    cleaned = sanitize_query(body.query or "", max_length=max_len)
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail="Query is required and must be non-empty after sanitization.",
        )
    _rag_ask_rate_limit_check(current_user.id)

    from app.services import rag_cache

    if not stream:
        cached = rag_cache.get_cached_response(cleaned, body.policy_id)
        if cached is not None:
            return {"answer": cached}

    policies_with_text = (
        db.query(Policy)
        .filter(Policy.extracted_text.isnot(None), Policy.extracted_text != "", Policy.is_active == True)
    )
    if body.policy_id is not None:
        policies_with_text = policies_with_text.filter(Policy.id == body.policy_id)
    policies_with_text = policies_with_text.all()
    fallback_policies = [{"name": p.name, "text": (p.extracted_text or "").strip()} for p in policies_with_text if (p.extracted_text or "").strip()]
    use_summaries_only = getattr(settings, "RAG_USE_SUMMARIES", False) and len(cleaned.split()) <= 6

    if stream:
        out_queue: queue.Queue[str | None] = queue.Queue()
        thread = threading.Thread(
            target=_stream_ask_sync_producer,
            args=(cleaned, body.policy_id, fallback_policies, out_queue, use_summaries_only),
        )
        thread.start()

        async def stream_events():
            while True:
                item = await asyncio.to_thread(out_queue.get)
                if item is None:
                    break
                yield item

        return StreamingResponse(
            stream_events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    answer, chunks_used, _r_ms, _l_ms, _t_sent, _t_ret = await asyncio.to_thread(_do_ask_sync, cleaned, body.policy_id, fallback_policies, use_summaries_only)

    if getattr(settings, "RAG_CACHE_RESPONSE", True):
        rag_cache.set_cached_response(cleaned, body.policy_id, answer)
    if chunks_used is not None and getattr(settings, "RAG_CACHE_CHUNKS", True):
        rag_cache.set_cached_chunks(cleaned, body.policy_id, chunks_used)

    return {"answer": answer}


@router.post("/reindex")
def policy_reindex(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Index all policies that have extracted_text into the RAG vector store.
    Use this to backfill the index for policies uploaded before RAG or when indexing failed at upload.
    """
    logger.info("RAG reindex requested")
    # Only index active (latest) policies so old versions do not appear in answers
    policies_active = (
        db.query(Policy)
        .filter(Policy.extracted_text.isnot(None), Policy.extracted_text != "", Policy.is_active == True)
        .all()
    )
    policies_inactive = (
        db.query(Policy)
        .filter(Policy.extracted_text.isnot(None), Policy.extracted_text != "", Policy.is_active == False)
        .all()
    )
    for p in policies_inactive:
        delete_policy_from_index(p.id)
    indexed = 0
    for i, p in enumerate(policies_active):
        ok = index_policy_chunks(p.extracted_text, p.id, p.name)
        if ok:
            indexed += 1
        logger.info("RAG policy %s/%s: policy_id=%s name=%s ok=%s", i + 1, len(policies_active), p.id, p.name, ok)
    logger.info("RAG reindex completed | indexed=%s | total_with_text=%s", indexed, len(policies_active))
    out = {"indexed": indexed, "total_with_text": len(policies_active)}
    if indexed == 0 and len(policies_active) > 0:
        status = get_rag_status()
        out["rag_available"] = status.get("available", False)
        out["hint"] = status.get("reason", "RAG is not available. Use local embeddings (pip install -r requirements.txt) and restart the backend.")
    logger.info("RAG reindex response: indexed=%s total=%s", out["indexed"], out["total_with_text"])
    return out


@router.get("/rag-status")
def policy_rag_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Return RAG index status: indexed_count and total policies with text.
    Used by Ask policy page to show status and optionally auto-trigger reindex.
    """
    total_with_text = (
        db.query(Policy)
        .filter(Policy.extracted_text.isnot(None), Policy.extracted_text != "", Policy.is_active == True)
        .count()
    )
    indexed_count = get_indexed_count()
    status = get_rag_status()
    return {
        "indexed_count": indexed_count,
        "total_with_text": total_with_text,
        "rag_available": status.get("available", False),
        "hint": status.get("reason", ""),
    }


@router.get("")
def list_policies(db: Session = Depends(get_db)) -> list:
    """List all policies with rules count."""
    policies = (
        db.query(Policy)
        .order_by(Policy.uploaded_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "version": p.version,
            "is_active": p.is_active,
            "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
            "rules_count": db.query(Rule).filter(Rule.policy_id == p.id).count(),
        }
        for p in policies
    ]


@router.post("/upload")
async def upload_policy(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Upload a policy PDF, extract text, extract rules, store policy and rules
    in the database, and return the stored rules.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        logger.warning("Policy upload rejected: not a PDF file")
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Rate limit: max successful uploads per hour (global)
    max_per_hour = _get_int_setting(db, "policy_upload_max_per_hour", DEFAULT_MAX_UPLOADS_PER_HOUR)
    if max_per_hour > 0:
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        count = (
            db.query(AuditLog)
            .filter(
                AuditLog.action_type == "policy_uploaded",
                AuditLog.timestamp >= since,
            )
            .count()
        )
        if count >= max_per_hour:
            logger.warning("Policy upload rate limit exceeded | count=%s | limit=%s", count, max_per_hour)
            raise HTTPException(
                status_code=429,
                detail=f"Too many policy uploads in the last hour (limit: {max_per_hour}). Try again later.",
            )

    # Per-file size limit (configurable MB)
    max_mb = _get_int_setting(db, "policy_upload_max_file_size_mb", DEFAULT_MAX_FILE_SIZE_MB)
    max_bytes = max_mb * 1024 * 1024
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            logger.warning("Policy upload rejected: file too large | size=%s | limit_mb=%s", total, max_mb)
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {max_mb} MB.",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".pdf", delete=False
        ) as tmp:
            path = tmp.name
            tmp.write(content)

        text = extract_text_from_pdf(path)
    except PDFExtractionError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        if path is not None and Path(path).exists():
            Path(path).unlink(missing_ok=True)

    policy_name = Path(file.filename or "policy.pdf").stem
    # Same name: increment version and mark previous versions inactive
    existing = (
        db.query(Policy).filter(Policy.name == policy_name).all()
    )
    existing_ids: list[int] = []
    if existing:
        max_version = db.query(func.max(Policy.version)).filter(
            Policy.name == policy_name
        ).scalar() or 0
        new_version = max_version + 1
        existing_ids = [p.id for p in existing]
        for p in existing:
            p.is_active = False
        policy = Policy(name=policy_name, version=new_version, is_active=True)
    else:
        policy = Policy(name=policy_name, version=1, is_active=True)
    db.add(policy)
    db.flush()

    # Persist policy text for RAG and index in vector store
    policy.extracted_text = text

    # Wait only for rule extraction so upload returns quickly; RAG indexing runs in background
    rule_dicts: list[dict] = []
    with ThreadPoolExecutor(max_workers=1) as executor:
        future_rules = executor.submit(extract_rules_from_text, text, policy.id)
        try:
            rule_dicts = future_rules.result(timeout=UPLOAD_PROCESS_TIMEOUT)
        except FuturesTimeoutError:
            logger.warning("Policy upload: rule extraction timed out after %ss; using fallback rules", UPLOAD_PROCESS_TIMEOUT)
            rule_dicts = _fallback_rules_from_text(text)
        except RuleExtractionError as e:
            logger.warning("Policy upload: rule extraction failed | error=%s", str(e))
            raise HTTPException(status_code=422, detail=str(e)) from e

    validated_rules = []
    for i, rd in enumerate(rule_dicts):
        try:
            validated = validate_rule_data(rd)
            validated_rules.append(validated)
        except ValueError as e:
            logger.warning(
                "Policy upload: rule validation failed | index=%s | error=%s",
                i,
                str(e),
            )
            raise HTTPException(
                status_code=422,
                detail=f"Rule at index {i} failed validation: {e}",
            ) from e

    for rd in validated_rules:
        severity = rd.get("severity") or "medium"
        rule = Rule(
            policy_id=policy.id,
            rule_data=rd,
            severity=severity,
        )
        db.add(rule)

    db.flush()
    # Index policy in RAG in background: remove old versions' chunks so only latest is used, then index new
    def _index_in_background() -> None:
        try:
            for old_id in existing_ids:
                delete_policy_from_index(old_id)
            index_policy_chunks(text, policy.id, policy_name)
        except Exception as e:
            logger.warning("RAG background index failed for policy_id=%s: %s", policy.id, e)
    threading.Thread(target=_index_in_background, daemon=True).start()

    stored_rules = (
        db.query(Rule).filter(Rule.policy_id == policy.id).order_by(Rule.id).all()
    )
    db.add(
        AuditLog(
            action_type="policy_uploaded",
            entity_type="policy",
            entity_id=policy.id,
            performed_by="system",
            meta={
                "policy_name": policy_name,
                "filename": file.filename,
                "rules_count": len(stored_rules),
            },
        )
    )
    db.add(
        Notification(
            type="success",
            title="Policy uploaded",
            body=f'"{policy_name}" uploaded with {len(stored_rules)} rules extracted.',
            read=False,
        )
    )
    db.commit()
    logger.info(
        "Policy upload completed | policy_name=%s | policy_id=%s | version=%s | rules_count=%s",
        policy_name,
        policy.id,
        policy.version,
        len(stored_rules),
    )
    return [_rule_to_response(rule) for rule in stored_rules]
