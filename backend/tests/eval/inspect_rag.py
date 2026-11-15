"""
RAG Pipeline Inspection Script — Step 3 of RAG evaluation.

Checks:
  - Distance metric used by Chroma collection
  - How many chunks each policy became, with 5 sample chunks
  - For 8 test questions: raw distances of top-10, computed scores, and pass/fail at 0.75 cutoff

Usage (from backend/):
    USE_COMPANY_DB_FOR_ASK=false python tests/eval/inspect_rag.py

Does NOT edit any application code or .env.
"""

import os
import sys

# Force the flag before any app code loads
os.environ["USE_COMPANY_DB_FOR_ASK"] = "false"

# Add backend root to path so app imports work
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_root)


def banner(title: str) -> None:
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def section(title: str) -> None:
    print(f"\n--- {title} ---")


# ── 1. Connect to Chroma directly ────────────────────────────────────────────
banner("STEP 1 · Connect to Chroma and read collection metadata")

import chromadb  # noqa: E402

from app.services.rag_service import (  # noqa: E402
    _chroma_path,
    _make_embedding_function,
    COLLECTION_NAME,
)

chroma_path = _chroma_path()
print(f"Chroma data folder : {chroma_path}")

client = chromadb.PersistentClient(path=chroma_path)
ef = _make_embedding_function()

try:
    collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
except Exception as e:
    print(f"ERROR: collection not found — {e}")
    print("Have you uploaded the PDFs yet? Run this script after uploading them.")
    sys.exit(1)

total_docs = collection.count()
print(f"Total chunks in collection : {total_docs}")

# Distance metric
meta = collection.metadata or {}
print(f"Collection metadata : {meta}")
hnsw_space = meta.get("hnsw:space", "(not set — Chroma default is L2)")
print(f"Distance metric (hnsw:space) : {hnsw_space}")
if not meta.get("hnsw:space"):
    print(
        "  ⚠  No explicit metric set. Chroma's default distance is L2 (Euclidean).\n"
        "     Score = 1.0 - distance, so L2 distance > 1.0 gives negative scores."
    )


# ── 2. Chunk counts and sample chunks per policy ──────────────────────────────
banner("STEP 2 · Chunk counts and sample chunks per policy")

# Fetch all docs with metadata
all_data = collection.get(include=["documents", "metadatas"])
all_docs = all_data.get("documents") or []
all_metas = all_data.get("metadatas") or []

from collections import defaultdict

policy_chunks: dict[str, list[tuple[int, str]]] = defaultdict(list)
for doc, meta in zip(all_docs, all_metas):
    name = meta.get("policy_name", "unknown")
    idx = meta.get("chunk_index", -1)
    policy_chunks[name].append((idx, doc))

for policy_name, chunks in sorted(policy_chunks.items()):
    section(f"Policy: {policy_name!r}")
    print(f"  Total chunks : {len(chunks)}")
    sorted_chunks = sorted(chunks, key=lambda x: x[0])
    print("\n  5 sample chunks (shown with chunk index):")
    sample = sorted_chunks[:5]
    for idx, text in sample:
        preview = text[:300].replace("\n", " ")
        # Check whether a sentence or clause is cut mid-way
        ends_ok = text.rstrip().endswith((".", "?", "!", '"', "'"))
        cut_flag = "" if ends_ok else "  ← chunk may cut mid-sentence"
        print(f"\n  [chunk {idx}]{cut_flag}")
        print(f"  {preview!r}")


# ── 3. For 8 test questions: distances, scores, cutoff ───────────────────────
banner("STEP 3 · Retrieval quality for 8 test questions")

TEST_QUESTIONS = [
    "What encryption algorithm must be used for personal data?",
    "How long can customer data be retained after the last transaction?",
    "What must third-party processors sign before handling personal data?",
    "Who is responsible for tracking training completion?",
    "Within how many days must new employees complete compliance training?",
    "What is the maximum age of an access review date?",
    "After how many months does data handling certification expire?",
    "What is the company's policy on remote work?",  # not in docs — expect 0 passes
]

CUTOFF = 0.75

for q in TEST_QUESTIONS:
    section(f"Q: {q!r}")
    # Query top-10 raw results
    results = collection.query(
        query_texts=[q],
        n_results=min(10, total_docs) if total_docs > 0 else 1,
        include=["documents", "distances", "metadatas"],
    )
    docs_list = (results.get("documents") or [[]])[0]
    dists_list = (results.get("distances") or [[]])[0]
    metas_list = (results.get("metadatas") or [[]])[0]

    if not docs_list:
        print("  No results returned from Chroma.")
        continue

    passing = 0
    print(f"  {'#':>3}  {'Raw dist':>10}  {'Score':>7}  {'Pass?':>6}  Chunk preview (60 chars)")
    print(f"  {'─'*3}  {'─'*10}  {'─'*7}  {'─'*6}  {'─'*60}")
    for rank, (dist, doc, meta) in enumerate(zip(dists_list, docs_list, metas_list), 1):
        score = 1.0 - float(dist)
        passes = score >= CUTOFF
        if passes:
            passing += 1
        flag = "✓" if passes else "✗"
        preview = doc[:60].replace("\n", " ")
        print(f"  {rank:>3}  {dist:>10.4f}  {score:>7.4f}  {flag:>6}  {preview!r}")

    if passing == 0:
        print(f"\n  ⚠  ZERO chunks pass the {CUTOFF} cutoff for this question.")
    else:
        print(f"\n  {passing} of {len(dists_list)} chunks pass the {CUTOFF} cutoff.")

print("\n")
banner("Inspection complete")
print(
    "Key things to look for:\n"
    "  • If distance metric is L2 and distances are > 1, scores go negative → nothing passes.\n"
    "  • If chunks cut sentences, context given to the LLM will be incomplete.\n"
    "  • If 0 chunks pass the cutoff for factual questions, retrieval is broken.\n"
)

