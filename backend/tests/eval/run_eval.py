"""
RAG Evaluation Script — Step 5 of RAG evaluation.

For each question in questions.json, calls POST /policy/ask, records:
  - the answer returned
  - whether it is correct
  - which chunks were retrieved (via direct Chroma call, since the API
    does not return chunks directly)
  - time taken

Prints a summary:
  - correct %
  - correct on factual (number) questions
  - correct on "not found" (unanswerable) questions
  - average time per question

Saves full results to backend/tests/eval/results_baseline.json.

Usage (from backend/):
    USE_COMPANY_DB_FOR_ASK=false python tests/eval/run_eval.py

The backend must be running at http://localhost:8000.
A valid JWT token is obtained automatically via POST /api/v1/auth/login
using the first admin user found (env vars EVAL_EMAIL / EVAL_PASSWORD,
or falls back to 'admin@example.com' / 'admin123').
"""

import json
import os
import sys
import time
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("EVAL_BASE_URL", "http://127.0.0.1:8000")
EMAIL    = os.environ.get("EVAL_EMAIL",    "admin@company.com")
PASSWORD = os.environ.get("EVAL_PASSWORD", "Admin@123")

QUESTIONS_FILE = Path(__file__).parent / "questions.json"
RESULTS_FILE   = Path(__file__).parent / (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("EVAL_RESULTS_FILE", "results_baseline_real.json"))

# Keywords that mean the AI correctly refused to answer
NOT_FOUND_PHRASES = [
    "not found in the provided documents",
    "not found in the provided policy",
    "exact sentence not found",
    "no policy documents are indexed",
    "search returned no results",
    "no indexed content",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_token(session: requests.Session) -> str:
    """Login and return JWT access token."""
    resp = session.post(
        f"{BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"ERROR: Login failed ({resp.status_code}): {resp.text[:300]}")
        sys.exit(1)
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        print(f"ERROR: No token in login response: {data}")
        sys.exit(1)
    return token


def ask(session: requests.Session, token: str, question: str) -> tuple[str, float]:
    """
    POST /policy/ask and return (answer_text, elapsed_seconds).
    USE_COMPANY_DB_FOR_ASK must be false so we exercise the RAG path.
    """
    t0 = time.perf_counter()
    resp = session.post(
        f"{BASE_URL}/policy/ask",
        json={"query": question},
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    elapsed = time.perf_counter() - t0
    if resp.status_code != 200:
        return f"HTTP_ERROR_{resp.status_code}: {resp.text[:200]}", elapsed
    data = resp.json()
    return (data.get("answer") or "").strip(), elapsed


def get_retrieved_chunks(question: str) -> list[dict]:
    """
    Call Chroma directly (bypassing the API) to get the top-5 chunks
    actually retrieved for this question. This mirrors exactly what the
    production retrieve() function does, so we can see what the LLM saw.
    """
    # Add backend root to path
    backend_root = str(Path(__file__).resolve().parent.parent.parent)
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    try:
        import chromadb
        from app.services.rag_service import (
            _chroma_path,
            _make_embedding_function,
            COLLECTION_NAME,
        )
        from app.config import settings

        client = chromadb.PersistentClient(path=_chroma_path())
        ef = _make_embedding_function()
        collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
        total = collection.count()
        if total == 0:
            return []
        k = min(getattr(settings, "RAG_TOP_K_MAX", 10), total)
        results = collection.query(
            query_texts=[question],
            n_results=k,
            include=["documents", "distances", "metadatas"],
        )
        docs   = (results.get("documents") or [[]])[0]
        dists  = (results.get("distances")  or [[]])[0]
        metas  = (results.get("metadatas")  or [[]])[0]
        cutoff = max(0.70, getattr(settings, "RAG_MIN_SIMILARITY", 0.75))
        chunks = []
        for doc, dist, meta in zip(docs, dists, metas):
            score = 1.0 - float(dist)
            chunks.append({
                "text":        doc[:200],  # first 200 chars for readability
                "raw_distance": round(float(dist), 4),
                "score":       round(score, 4),
                "passes_cutoff": score >= cutoff,
                "policy_name": meta.get("policy_name"),
                "chunk_index": meta.get("chunk_index"),
            })
        return chunks
    except Exception as e:
        return [{"error": str(e)}]


def is_correct(q: dict, answer: str) -> bool:
    """
    Determine if the answer is correct:
      - For 'not_in_documents' questions: answer must contain a "not found" phrase.
      - For factual / multi_sentence questions: the expected key terms must appear
        in the answer (case-insensitive).
    """
    answer_lower = answer.lower()

    if q["category"] == "not_in_documents":
        return any(phrase in answer_lower for phrase in NOT_FOUND_PHRASES)

    expected = (q.get("expected_answer") or "").lower()
    # Accept if any significant word from expected answer appears in the answer
    # For short expected answers (single value like "30 days"), check the whole phrase
    if len(expected.split()) <= 4:
        return expected in answer_lower
    # For longer expected answers, check that most key words are present
    words = [w for w in expected.split() if len(w) > 3]
    if not words:
        return expected in answer_lower
    hits = sum(1 for w in words if w in answer_lower)
    return hits >= max(1, len(words) // 2)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    with open(QUESTIONS_FILE, encoding="utf-8") as f:
        qdata = json.load(f)
    questions = qdata["questions"]

    session = requests.Session()
    token = get_token(session)
    print(f"Logged in. Running {len(questions)} questions against {BASE_URL}/policy/ask …\n")
    print(f"{'#':>3}  {'Cat':>18}  {'OK?':>5}  {'Time':>7}  Question (truncated)")
    print(f"{'─'*3}  {'─'*18}  {'─'*5}  {'─'*7}  {'─'*50}")

    results = []
    for q in questions:
        answer, elapsed = ask(session, token, q["question"])
        retrieved = get_retrieved_chunks(q["question"])
        correct = is_correct(q, answer)

        row = {
            "id":           q["id"],
            "category":     q["category"],
            "question":     q["question"],
            "expected":     q.get("expected_answer"),
            "answer":       answer,
            "correct":      correct,
            "elapsed_sec":  round(elapsed, 3),
            "retrieved_chunks": retrieved,
        }
        results.append(row)

        ok_flag = "✓" if correct else "✗"
        q_short = q["question"][:48]
        print(f"{q['id']:>3}  {q['category']:>18}  {ok_flag:>5}  {elapsed:>6.1f}s  {q_short!r}")

    # ── Summary ───────────────────────────────────────────────────────────────
    total      = len(results)
    n_correct  = sum(1 for r in results if r["correct"])
    pct        = 100 * n_correct / total if total else 0

    factual = [r for r in results if r["category"] in ("factual", "multi_sentence")]
    n_factual_ok = sum(1 for r in factual if r["correct"])

    number_qs = [r for r in results if r["category"] == "factual"
                 and any(c.isdigit() for c in (r["expected"] or ""))]
    n_num_ok = sum(1 for r in number_qs if r["correct"])

    not_found_qs = [r for r in results if r["category"] == "not_in_documents"]
    n_nf_ok = sum(1 for r in not_found_qs if r["correct"])

    avg_time = sum(r["elapsed_sec"] for r in results) / total if total else 0

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Total questions          : {total}")
    print(f"  Correct overall          : {n_correct}/{total}  ({pct:.1f}%)")
    print(f"  Correct factual/multi    : {n_factual_ok}/{len(factual)}")
    print(f"  Correct on number Qs     : {n_num_ok}/{len(number_qs)}")
    print(f"  Correct 'not in docs'    : {n_nf_ok}/{len(not_found_qs)}")
    print(f"  Average time per Q       : {avg_time:.1f}s")

    # ── 8 Worst failures ──────────────────────────────────────────────────────
    failures = [r for r in results if not r["correct"]]
    failures.sort(key=lambda r: r["elapsed_sec"])  # fastest first so we see more variety
    worst = failures[:8]

    print("\n" + "=" * 70)
    print("8 WORST FAILURES")
    print("=" * 70)
    for i, r in enumerate(worst, 1):
        chunks = r["retrieved_chunks"]
        passes = [c for c in chunks if isinstance(c, dict) and c.get("passes_cutoff")]
        top_raw = [c.get("raw_distance") for c in chunks if isinstance(c, dict) and c.get("raw_distance") is not None]
        all_failed_cutoff = len(passes) == 0 and len(chunks) > 0
        no_chunks = len(chunks) == 0
        ai_got_context = len(passes) > 0

        if no_chunks:
            reason = "nothing retrieved — RAG index may be empty"
        elif all_failed_cutoff:
            top_score = max((c.get("score", 0) for c in chunks if isinstance(c, dict)), default=0)
            reason = f"nothing passed 0.75 cutoff (best score = {top_score:.4f}) — L2 distance > 1 causes negative score"
        elif r["answer"].lower().startswith("http_error"):
            reason = f"API error — {r['answer']}"
        else:
            reason = "chunks retrieved and passed cutoff but AI gave wrong answer"

        print(f"\n  Failure {i} (Q{r['id']}): {r['question']!r}")
        print(f"    Category           : {r['category']}")
        print(f"    Expected           : {r['expected']!r}")
        print(f"    Got                : {r['answer'][:200]!r}")
        print(f"    Chunks passing >=0.75 : {len(passes)} of {len(chunks)}")
        print(f"    Top raw distances  : {top_raw[:3]}")
        print(f"    AI got context     : {ai_got_context}")
        print(f"    Reason             : {reason}")

    # ── Save JSON ─────────────────────────────────────────────────────────────
    output = {
        "summary": {
            "total": total,
            "correct": n_correct,
            "correct_pct": round(pct, 1),
            "correct_factual": n_factual_ok,
            "correct_number_questions": n_num_ok,
            "correct_not_found": n_nf_ok,
            "avg_time_sec": round(avg_time, 2),
        },
        "results": results,
    }
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nFull results saved to: {RESULTS_FILE}")


if __name__ == "__main__":
    # Ensure the env flag is set before any app code runs
    os.environ.setdefault("USE_COMPANY_DB_FOR_ASK", "false")
    main()
