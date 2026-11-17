"""LLM client for chat completion. Uses Groq when GROQ_API_KEY is set; optional OpenAI fallback when Groq not set."""

import logging
import time
from typing import Any
from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_GROQ_ANSWER_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_FAST_MODEL = "openai/gpt-oss-20b"


def get_completion_client() -> OpenAI:
    """Return an OpenAI-compatible client for chat completion. Uses Groq when GROQ_API_KEY is set."""
    groq_key = (getattr(settings, "GROQ_API_KEY", None) or "").strip()
    if groq_key:
        return OpenAI(
            api_key=groq_key,
            base_url=GROQ_BASE_URL,
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY or "")


def get_answer_model() -> str:
    """Return the model id for high-quality answers and rule extraction."""
    if is_groq_used():
        return (
            getattr(settings, "GROQ_ANSWER_MODEL", None)
            or getattr(settings, "GROQ_MODEL", None)
            or DEFAULT_GROQ_ANSWER_MODEL
        )
    return OPENAI_DEFAULT_MODEL


def get_fast_model() -> str:
    """Return the model id for fast tasks (explanations, remediations, summaries)."""
    if is_groq_used():
        return getattr(settings, "GROQ_FAST_MODEL", None) or DEFAULT_GROQ_FAST_MODEL
    return OPENAI_DEFAULT_MODEL


def get_completion_model(kind: str = "answer") -> str:
    """Return the model id to use for chat completion ('answer' or 'fast')."""
    if kind == "fast":
        return get_fast_model()
    return get_answer_model()


def is_groq_used() -> bool:
    """True if completion uses Groq (GROQ_API_KEY set)."""
    return bool((getattr(settings, "GROQ_API_KEY", None) or "").strip())


def is_completion_available() -> bool:
    """True if we have at least one LLM for completion (Groq or OpenAI with non-placeholder key)."""
    if is_groq_used():
        return True
    key = (getattr(settings, "OPENAI_API_KEY", None) or "").strip()
    return bool(key) and "your_openai_key_here" not in key.lower()


def chat_completion_with_retry(
    client: OpenAI | None = None,
    model: str | None = None,
    kind: str = "answer",
    max_retries: int = 3,
    **kwargs: Any,
) -> Any:
    """
    Call client.chat.completions.create with automatic retry for Groq 429 rate limits (up to max_retries).
    Configures reasoning settings (reasoning_format='hidden', reasoning_effort='low') for gpt-oss models
    to prevent reasoning text from leaking into answers or JSON.
    """
    if client is None:
        client = get_completion_client()
    if model is None:
        model = get_completion_model(kind=kind)

    call_kwargs = dict(kwargs)
    call_kwargs["model"] = model

    # For reasoning models (e.g. gpt-oss), configure hidden reasoning and low effort
    if "gpt-oss" in model.lower():
        extra_body = dict(call_kwargs.get("extra_body") or {})
        extra_body.setdefault("reasoning_format", "hidden")
        extra_body.setdefault("reasoning_effort", "low")
        call_kwargs["extra_body"] = extra_body
        # Ensure enough tokens so answer/JSON is not cut off
        curr_max = call_kwargs.get("max_tokens")
        if curr_max is None or curr_max < 512:
            call_kwargs["max_tokens"] = 1024

    for attempt in range(1, max_retries + 1):
        try:
            return client.chat.completions.create(**call_kwargs)
        except Exception as e:
            err_msg = str(e)
            status_code = getattr(e, "status_code", None)
            is_429 = (status_code == 429) or ("429" in err_msg) or ("rate_limit" in err_msg.lower())
            if is_429 and attempt <= max_retries:
                wait_sec = 2 ** attempt
                logger.warning(
                    "Groq rate limit (429) encountered on attempt %s/%s. Waiting %ss before retry...",
                    attempt,
                    max_retries,
                    wait_sec,
                )
                time.sleep(wait_sec)
            else:
                raise


def check_groq_models_at_startup() -> None:
    """Check if configured Groq models are in the models usable by the current API key. Non-fatal."""
    if not is_groq_used():
        return
    groq_key = (getattr(settings, "GROQ_API_KEY", None) or "").strip()
    try:
        from groq import Groq

        groq_client = Groq(api_key=groq_key)
        models_data = groq_client.models.list()
        available_ids = sorted([m.id for m in models_data.data if getattr(m, "active", True)])

        configured_models = {
            "GROQ_ANSWER_MODEL": get_answer_model(),
            "GROQ_FAST_MODEL": get_fast_model(),
        }

        mismatches = []
        for conf_name, model_id in configured_models.items():
            if model_id not in available_ids:
                mismatches.append((conf_name, model_id))

        if mismatches:
            usable_list = "\n".join(f"  - {m}" for m in available_ids)
            msg = (
                f"\n{'='*70}\n"
                f"WARNING: The following configured Groq model(s) are NOT available with your API key:\n"
            )
            for conf_name, model_id in mismatches:
                msg += f"  • {conf_name}: '{model_id}' (unavailable)\n"
            msg += (
                f"\nYour API key can currently use these active models:\n{usable_list}\n"
                f"Please update {', '.join(k for k, _ in mismatches)} in backend/.env.\n"
                f"{'='*70}\n"
            )
            print(msg)
            logger.warning(msg)
        else:
            logger.info("Groq models validated successfully: %s", configured_models)
    except Exception as e:
        logger.warning("Could not check Groq models at startup (non-fatal): %s", e)
