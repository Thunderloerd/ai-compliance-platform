"""
All-in-one runner (connects to already-running backend at port 8000):
  2. Upload sample-policy.pdf and sample-hr-policy.pdf
  3. RAG inspection (distance metric, chunk counts, 8-question analysis)
  5-6. Full 25-question evaluation → results_baseline.json

Run from backend/ directory:
    python tests/eval/run_all.py

Backend must already be running (USE_COMPANY_DB_FOR_ASK=false) at port 8000.
No edits to .env or any app code.
"""

import os
import sys
import time
import json
from pathlib import Path

# ── Force env flag BEFORE any app code is imported ───────────────────────────
os.environ["USE_COMPANY_DB_FOR_ASK"] = "false"

# Add backend root to Python path
backend_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_root))

import requests

BASE_URL = os.environ.get("EVAL_BASE_URL", "http://127.0.0.1:8000")
EMAIL    = os.environ.get("EVAL_EMAIL",    "admin@company.com")
PASSWORD = os.environ.get("EVAL_PASSWORD", "Admin@123")

QUESTIONS_FILE = Path(__file__).parent / "questions.json"
RESULTS_FILE   = Path(__file__).parent / "results_baseline.json"


# ── Login ─────────────────────────────────────────────────────────────────────
print("Logging in …")
session = requests.Session()
resp = session.post(f"{BASE_URL}/auth/login",
                    json={"email": EMAIL, "password": PASSWORD}, timeout=15)
if resp.status_code != 200:
    print(f"ERROR: Login failed ({resp.status_code}): {resp.text[:300]}")
    sys.exit(1)
data = resp.json()
token = data.get("token") or data.get("access_token")
if not token:
    print(f"ERROR: No token in login response: {data}")
    sys.exit(1)
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in as {EMAIL}")


# ── STEP 2 · Upload PDFs ──────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("STEP 2 · Upload PDFs")
print("=" * 70)

for pdf_name in ["sample-policy.pdf", "sample-hr-policy.pdf"]:
    pdf_path = backend_root / pdf_name
    if not pdf_path.exists():
        print(f"  WARNING: {pdf_path} not found — skipping")
        continue
    with open(pdf_path, "rb") as f:
        resp = session.post(
            f"{BASE_URL}/policy/upload",
            files={"file": (pdf_name, f, "application/pdf")},
            timeout=120,
        )
    if resp.status_code == 200:
        rules = resp.json()
        print(f"  ✓ Uploaded {pdf_name}  →  {len(rules)} rules extracted")
    else:
        print(f"  ✗ Upload failed for {pdf_name}: {resp.status_code} {resp.text[:200]}")

print("\nWaiting 15s for background RAG indexing …")
time.sleep(15)

resp = session.get(f"{BASE_URL}/policy/rag-status", headers=headers, timeout=15)
if resp.status_code == 200:
    rstat = resp.json()
    print(f"  RAG indexed count : {rstat.get('indexed_count')}")
    print(f"  RAG available     : {rstat.get('rag_available')}")
    if rstat.get("hint"):
        print(f"  Hint              : {rstat['hint']}")
    if rstat.get("indexed_count", 0) == 0:
        print("  Indexed count is 0 — triggering reindex …")
        resp2 = session.post(f"{BASE_URL}/policy/reindex", headers=headers, timeout=120)
        print(f"  Reindex response  : {resp2.status_code} {resp2.text[:300]}")
        time.sleep(10)


# ── STEP 3 · RAG Inspection ───────────────────────────────────────────────────
print("\n" + "=" * 70)
print("STEP 3 · RAG Inspection (Chroma collection details)")
print("=" * 70)

import chromadb
from app.services.rag_service import (
    _chroma_path,
    _make_embedding_function,
    COLLECTION_NAME,
)
from app.config import settings

chroma_path = _chroma_path()
print(f"\nChroma data folder : {chroma_path}")

client = chromadb.PersistentClient(path=chroma_path)
ef = _make_embedding_function()

try:
    collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
except Exception as e:
    print(f"ERROR: collection not found — {e}")
    sys.exit(1)

total_docs = collection.count()
print(f"Total chunks in collection : {total_docs}")

meta = collection.metadata or {}
print(f"Collection metadata        : {meta}")
hnsw_space = meta.get("hnsw:space", "(not explicitly set)")
print(f"\nDistance metric (hnsw:space) : {hnsw_space}")
if not meta.get("hnsw:space"):
    print(
        "  ⚠  No explicit metric stored in collection metadata.\n"
        "     Chroma's default is L2 (Euclidean). The code converts distance to\n"
        "     score with:  score = 1.0 - distance\n"
        "     L2 distances for local embeddings are typically in range 0–4+,\n"
        "     so scores are often negative → nothing passes the 0.75 cutoff."
    )
else:
    print(f"  Metric is explicitly set to: {hnsw_space!r}")

# Chunk counts + 5 sample chunks per policy
all_data = collection.get(include=["documents", "metadatas"])
all_docs  = all_data.get("documents") or []
all_metas = all_data.get("metadatas") or []

from collections import defaultdict
policy_chunks: dict = defaultdict(list)
for doc, m in zip(all_docs, all_metas):
    name = m.get("policy_name", "unknown")
    idx  = m.get("chunk_index", -1)
    policy_chunks[name].append((idx, doc))

print("\n--- Chunk counts and samples per policy ---")
for pname, chunks in sorted(policy_chunks.items()):
    print(f"\n  Policy: {pname!r}  →  {len(chunks)} chunk(s)")
    sorted_chunks = sorted(chunks, key=lambda x: x[0])
    print("  5 sample chunks (first 300 chars each):")
    for idx, text in sorted_chunks[:5]:
        ends_ok  = text.rstrip().endswith((".", "?", "!", '"', "'"))
        cut_flag = "" if ends_ok else "  ← MAY CUT MID-SENTENCE"
        preview  = text[:300].replace("\n", " ")
        print(f"\n    [chunk {idx}]{cut_flag}")
        print(f"    {preview!r}")

# 8 test questions
TEST_QUESTIONS = [
    "What encryption algorithm must be used for personal data?",
    "How long can customer data be retained after the last transaction?",
    "What must third-party processors sign before handling personal data?",
    "Who is responsible for tracking training completion?",
    "Within how many days must new employees complete compliance training?",
    "What is the maximum age of an access review date?",
    "After how many months does data handling certification expire?",
    "What is the company's policy on remote work?",
]
CUTOFF = 0.75

print(f"\n{'=' * 70}")
print("  8 Test Questions: raw distances, scores, cutoff pass/fail")
print(f"{'=' * 70}")

for q in TEST_QUESTIONS:
    print(f"\nQ: {q!r}")
    n = max(1, min(10, total_docs))
    results = collection.query(
        query_texts=[q],
        n_results=n,
        include=["documents", "distances", "metadatas"],
    )
    docs_list  = (results.get("documents") or [[]])[0]
    dists_list = (results.get("distances")  or [[]])[0]

    if not docs_list:
        print("  No results.")
        continue

    passing = 0
    print(f"  {'#':>3}  {'Raw dist':>10}  {'Score (1-d)':>12}  {'≥0.75?':>7}  Chunk preview (60 chars)")
    print(f"  {'─'*3}  {'─'*10}  {'─'*12}  {'─'*7}  {'─'*60}")
    for rank, (dist, doc) in enumerate(zip(dists_list, docs_list), 1):
        score  = 1.0 - float(dist)
        passes = score >= CUTOFF
        if passes:
            passing += 1
        flag    = "YES ✓" if passes else "no"
        preview = doc[:60].replace("\n", " ")
        print(f"  {rank:>3}  {dist:>10.4f}  {score:>12.4f}  {flag:>7}  {preview!r}")

    if passing == 0:
        print(f"\n  ⚠  ZERO chunks pass the {CUTOFF} cutoff for this question.")
    else:
        print(f"\n  {passing} of {len(dists_list)} chunk(s) pass the {CUTOFF} cutoff.")


# ── STEPS 5-6 · Full Evaluation ───────────────────────────────────────────────
print("\n" + "=" * 70)
print("STEPS 5-6 · Full 25-question evaluation")
print("=" * 70)

NOT_FOUND_PHRASES = [
    "not found in the provided documents",
    "not found in the provided policy",
    "exact sentence not found",
    "no policy documents are indexed",
    "search returned no results",
    "no indexed content",
]


def ask_question(question: str) -> tuple[str, float]:
    t0 = time.perf_counter()
    r = session.post(
        f"{BASE_URL}/policy/ask",
        json={"query": question},
        headers=headers,
        timeout=60,
    )
    elapsed = time.perf_counter() - t0
    if r.status_code != 200:
        return f"HTTP_ERROR_{r.status_code}: {r.text[:200]}", elapsed
    return (r.json().get("answer") or "").strip(), elapsed


def get_retrieved_chunks(question: str) -> list[dict]:
    try:
        k = max(1, min(getattr(settings, "RAG_TOP_K_MAX", 10), total_docs))
        results = collection.query(
            query_texts=[question],
            n_results=k,
            include=["documents", "distances", "metadatas"],
        )
        docs_   = (results.get("documents") or [[]])[0]
        dists_  = (results.get("distances")  or [[]])[0]
        metas_  = (results.get("metadatas")  or [[]])[0]
        cutoff  = max(0.70, getattr(settings, "RAG_MIN_SIMILARITY", 0.75))
        return [
            {
                "text":          doc[:200],
                "score":         round(1.0 - float(dist), 4),
                "passes_cutoff": (1.0 - float(dist)) >= cutoff,
                "policy_name":   meta.get("policy_name"),
                "chunk_index":   meta.get("chunk_index"),
            }
            for doc, dist, meta in zip(docs_, dists_, metas_)
        ]
    except Exception as e:
        return [{"error": str(e)}]


def is_correct(q: dict, answer: str) -> bool:
    al = answer.lower()
    if q["category"] == "not_in_documents":
        return any(ph in al for ph in NOT_FOUND_PHRASES)
    expected = (q.get("expected_answer") or "").lower()
    if len(expected.split()) <= 4:
        return expected in al
    words = [w for w in expected.split() if len(w) > 3]
    if not words:
        return expected in al
    hits = sum(1 for w in words if w in al)
    return hits >= max(1, len(words) // 2)


with open(QUESTIONS_FILE, encoding="utf-8") as f:
    qdata = json.load(f)
questions = qdata["questions"]

print(f"\nRunning {len(questions)} questions …\n")
print(f"{'#':>3}  {'Category':>18}  {'OK?':>5}  {'Time':>7}  Question")
print(f"{'─'*3}  {'─'*18}  {'─'*5}  {'─'*7}  {'─'*50}")

eval_results = []
for q in questions:
    answer, elapsed = ask_question(q["question"])
    retrieved = get_retrieved_chunks(q["question"])
    correct   = is_correct(q, answer)
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
    eval_results.append(row)
    ok = "✓" if correct else "✗"
    print(f"{q['id']:>3}  {q['category']:>18}  {ok:>5}  {elapsed:>6.1f}s  {q['question'][:48]!r}")

# Summary
total     = len(eval_results)
n_correct = sum(1 for r in eval_results if r["correct"])
pct       = 100 * n_correct / total if total else 0

factual   = [r for r in eval_results if r["category"] in ("factual", "multi_sentence")]
n_fact_ok = sum(1 for r in factual if r["correct"])

num_qs    = [r for r in eval_results if r["category"] == "factual"
             and any(c.isdigit() for c in (r["expected"] or ""))]
n_num_ok  = sum(1 for r in num_qs if r["correct"])

nf_qs     = [r for r in eval_results if r["category"] == "not_in_documents"]
n_nf_ok   = sum(1 for r in nf_qs if r["correct"])

avg_time  = sum(r["elapsed_sec"] for r in eval_results) / total if total else 0

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"  Total questions          : {total}")
print(f"  Correct overall          : {n_correct}/{total}  ({pct:.1f}%)")
print(f"  Correct factual/multi    : {n_fact_ok}/{len(factual)}")
print(f"  Correct on number Qs     : {n_num_ok}/{len(num_qs)}")
print(f"  Correct 'not in docs'    : {n_nf_ok}/{len(nf_qs)}")
print(f"  Average time per Q       : {avg_time:.1f}s")

# 5 worst failures
failures = [r for r in eval_results if not r["correct"]]
worst    = failures[:5]

print("\n" + "=" * 70)
print("5 WORST FAILURES")
print("=" * 70)
for i, r in enumerate(worst, 1):
    chunks   = r["retrieved_chunks"]
    passes   = [c for c in chunks if isinstance(c, dict) and c.get("passes_cutoff")]
    no_chunks = len(chunks) == 0
    all_fail  = len(passes) == 0 and not no_chunks

    if no_chunks:
        reason = "nothing retrieved — RAG index empty or Chroma error"
    elif all_fail:
        top_score = max((c.get("score", 0) for c in chunks if isinstance(c, dict)), default=0)
        reason = f"nothing passed the 0.75 cutoff (best score = {top_score:.4f}) — L2 distance > 1 means score goes negative"
    elif r["answer"].lower().startswith("http_error"):
        reason = f"API error — {r['answer']}"
    else:
        reason = "chunks retrieved and passed cutoff but AI gave a wrong or incomplete answer"

    print(f"\n  Failure {i}  (Q{r['id']}): {r['question']!r}")
    print(f"    Category : {r['category']}")
    print(f"    Expected : {r['expected']!r}")
    print(f"    Got      : {r['answer'][:250]!r}")
    print(f"    Reason   : {reason}")

# Save
output = {
    "summary": {
        "total":                    total,
        "correct":                  n_correct,
        "correct_pct":              round(pct, 1),
        "correct_factual_multi":    n_fact_ok,
        "correct_number_questions": n_num_ok,
        "correct_not_found":        n_nf_ok,
        "avg_time_sec":             round(avg_time, 2),
    },
    "results": eval_results,
}
with open(RESULTS_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nFull results saved → {RESULTS_FILE}")
print("\nDone.")
