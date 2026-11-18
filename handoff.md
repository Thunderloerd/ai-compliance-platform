# AI Compliance Platform: Project Handoff

Written on 2026-11-18 for the teammate who continues this project.
Read this file fully before you change anything. It takes about 10 minutes.

---

## 1. What this project is

A platform for a client that checks a company's HR and compliance policies.

1. You upload a policy PDF.
2. AI turns the policy sentences into **rules**.
3. Each rule becomes a database check. A scan finds records that break the rule (**violations**).
4. AI explains each violation and suggests a fix.
5. Users can also **ask questions about the policy** ("Ask Policy"). This uses RAG: the policy is split into chunks, stored by meaning in Chroma, and the AI answers from the best chunks.

The project will run on **sample data** (not real client data). Sample data has not been created yet.

**Tech stack**
- Backend: FastAPI (Python 3.10), PostgreSQL, SQLAlchemy
- Vector store: Chroma (local folder `backend/data/chroma`)
- Embeddings: `all-MiniLM-L6-v2`, runs locally
- AI answers: Groq API
- Frontend: plain HTML, CSS and JavaScript in `frontend/` (the old Next.js app in `src/` is still in the repo and is being replaced)

---

## 2. Honest status today

| Area | Status | Notes |
|---|---|---|
| Backend starts, `/health` passes | Working | PostgreSQL, scheduler and Groq key all OK |
| Login and roles (Admin, Compliance, Viewer) | Working | Default admin is created at first start (see section 4) |
| Groq model setup | **Fixed, needs your check** | Now set by environment variables (section 3) |
| Upload policy PDF | **Changed, needs your check** | Policy is saved and indexed before rule extraction (section 3) |
| Rule extraction | **Needs your check** | Reported to return valid JSON, but rule quality is not verified |
| Retrieval (Ask Policy) | **Not good yet** | Known bugs: wrong distance metric and sentence-cutting chunks |
| Accuracy numbers | **Not recorded yet** | The real baseline has not been run (see section 5) |
| Scans on a company database | Not tested | No company database is connected yet |
| Frontend (`frontend/`) | Partly done | Login, dashboard, upload, rules, violations, review exist. Six pages were still "Coming soon" at the last check: ask-policy, policy-impact, reports, search, profile, settings. There is no Users page. Check this yourself. |

**Important:** an earlier test showed "20% accuracy". **Ignore that number.** The index was empty at that time, so the 5 "not found" questions passed by accident and the other 20 could not pass. It is not a real baseline.

---

## 3. What was changed in the latest work

1. **Groq models are now settings, not hard-coded.**
   - The old model `llama-3.3-70b-versatile` gave a 404 on our key.
   - `GROQ_ANSWER_MODEL=openai/gpt-oss-120b` is used for answers and rule extraction.
   - `GROQ_FAST_MODEL=openai/gpt-oss-20b` is used for explanations and summaries.
   - These are reasoning models. The code hides the reasoning text, uses low reasoning effort, and retries up to 3 times on Groq rate-limit errors (HTTP 429).
   - On startup, the app warns if a configured model is not available on the key. It still starts.
   - Model lists change over time. If you get a 404, check which models the key can use and change the two settings.
2. **Upload is safer.**
   - Order is now: save policy, extract text, index in Chroma, commit. Then try rule extraction.
   - If rule extraction fails, the policy and index are kept. The response shows `rules_status = "failed"` and the error.
   - New endpoint: `POST /policy/{policy_id}/extract-rules` to retry rule extraction later.
   - Uploading the same policy again creates a new version and marks the old one inactive.
3. **Evaluation files** were added in `backend/tests/eval/`:
   - `questions.json` has 25 questions: 15 factual, 5 needing several sentences or sections, 5 whose answer is NOT in the documents.
   - `run_eval.py` asks each question through `POST /policy/ask` and scores it.
   - `upload_policies.py` uploads the two sample PDFs and prints chunk counts.

---

## 4. How to run it (Windows PowerShell)

**First time only**
1. Make sure PostgreSQL is running and a database called `compliance_db` exists.
2. Create `backend/.env` from `backend/.env.example`. Fill in `DATABASE_URL` with your own password and `GROQ_API_KEY` with your own key. **Never commit `.env`.** Check that it is in `.gitignore`.
3. Install packages: `pip install -r requirements.txt` inside `backend/`.

**Start the backend** (inside `backend/`)
```
$env:USE_COMPANY_DB_FOR_ASK="false"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Look for the log line "Groq models validated successfully". Open http://localhost:8000/docs to see the API.

If you get "only one usage of each socket address", something is already using port 8000. Run `netstat -ano | findstr :8000`, then `taskkill /PID <number> /F`.

**Start the frontend** (inside `frontend/`)
```
python -m http.server 5500
```
Open http://localhost:5500. The backend address is set in one place: `frontend/js/config.js`.

**Default login (demo only):** `admin@company.com` / `Admin@123`. It is created at first start by `backend/app/database.py`. Change it before showing this to anyone outside the team.

**Why `USE_COMPANY_DB_FOR_ASK=false`?** When it is true, Ask Policy first tries a plain keyword search on the company database and only then the vector search. We want to test the vector search, so we turn that off for testing.

---

## 5. Your first task: record the TRUE baseline

Do this before changing any retrieval code. You need a "before" number.

1. Start the backend as above.
2. In a second terminal inside `backend/`: `python tests/eval/upload_policies.py`
   - Check that both PDFs upload and that the chunk count per policy is more than 0.
3. Run: `python tests/eval/run_eval.py results_baseline_real.json`
4. Fill this table (and keep the JSON file in the repo):

| Measure | Result |
|---|---|
| Overall correct % | |
| Factual and multi-section % | |
| Number questions % | |
| "Not found" questions % | |
| Average time per question | |
| Average chunks passing the 0.75 cutoff | |

Expect low numbers. That is normal. They prove the problems in section 6 and give us something to beat.

---

## 6. Known problems (in order of importance)

### RAG (fix these first)
1. **Wrong distance metric.** Chroma uses L2 by default. The code computes `score = 1 - distance` and drops anything under 0.75. With L2 this can make scores negative, so almost nothing passes. Fix: use cosine distance and pick the cutoff from real score numbers.
2. **Chunks cut sentences in half.** Splitting is by 512 tokens only. Policies are written in numbered clauses, so split by section and clause first.
3. **Two competing search paths in Ask Policy.** The keyword search on the company database runs first, and the better vector search runs only if that finds nothing. Make vector plus keyword (hybrid) search the main path.
4. **No reranker.** `RAG_USE_RERANKER=false`.
5. **"Not found" handling is not reliable.** The AI should not be called at all when no good chunk is found.

### Rule extraction and scans
6. **Long policies lose most rules.** Extraction reads only the top 5 chunks for policies over about 8,000 characters. Process the whole policy section by section.
7. **Rules are guessed, not matched to the real database.** The AI invents table and column names. Give it the real schema and make it pick only from that. Rules pointing to missing tables or columns are skipped silently. Return a clear "skipped rules" list.
8. **Empty values are never flagged.** The scan uses `NOT (condition)`. In SQL, NOT of an unknown value is unknown, so rows with an empty field are not flagged.
9. **Rule meaning can be flipped.** The training-deadline example in the extraction prompt uses `value: false`, which can flag the opposite people. Rules should describe the compliant state, and something should check the rule against its policy sentence.
10. **Policy compare is crude.** It compares rules by exact match, so a reworded rule shows as removed plus added.

### Security and cleanup
11. Several routes (upload, scan, list) do not require login. Admin-only actions are not all enforced.
12. `.env.example` contained a default database password. Use placeholders.
13. README and `HOW_IT_WORKS.md` still say OpenAI. The code uses Groq.
14. Stray files `backend/4.0.0` and `backend/uvicorn` look accidental. Check and remove them.
15. Two frontends exist (`src/` Next.js and `frontend/`). Decide which stays and delete the other once `frontend/` has all pages.

---

## 7. Roadmap (do in this order)

**Rule: change one thing at a time and re-run the eval after each step.** If a step makes the score worse, undo it.

| Step | Work | Done when |
|---|---|---|
| 0 | Record the true baseline (section 5) | Table filled, JSON saved |
| 1 | Cosine distance, fix score and cutoff | Chunks now pass the cutoff, score goes up |
| 2 | Clause-aware chunking, with policy name, version, section and page in metadata | Chunks no longer cut sentences |
| 3 | Compare small embedding models on our questions: `all-MiniLM-L6-v2` (current), `BAAI/bge-small-en-v1.5`, `intfloat/e5-small-v2` | Best model chosen by numbers and set by an environment variable |
| 4 | Hybrid search: BM25 keyword plus vector, merged with reciprocal rank fusion | Exact terms such as "7 years" or "GDPR" are found |
| 5 | Rerank the top 20 with a small cross-encoder, keep the best 5 | Hit rate up, time cost recorded |
| 6 | Answer prompt: answer only from excerpts, cite policy and section, exact reply "Not found in the provided documents." when missing; low temperature | "Not found" questions pass for the right reason |
| 7 | Score threshold to skip the AI call when nothing relevant exists; update tests; write `docs/RAG_PIPELINE.md` | Tests pass |
| 8 | Fix rule extraction (problems 6 to 10 above) | Rules match their policy sentences |
| 9 | Security and cleanup (problems 11 to 15) | Every route is protected |
| 10 | **PageIndex experiment** (section 8) | Side-by-side numbers on the same questions |
| 11 | Create **sample data** (section 9) | Scans run end to end |
| 12 | Finish the 6 frontend stub pages and the Users page | No "Coming soon" pages |
| 13 | Decide on Supabase (section 10) | Demo deployed |

### Design idea
Small, fast embedding models find the text. The biggest model (`gpt-oss-120b`) reads only the best chunks and writes the answer with citations. Keep the old code path behind `RAG_MODE=legacy` until the new one is proven.

---

## 8. PageIndex experiment (after the RAG fixes)

PageIndex ([github.com/VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex), MIT licence) does not use a vector database. It builds a tree of sections for each document, and an AI reads the tree to choose the right section. It fits policy documents because they are clause-based, and it gives page and section citations that auditors like.

Things to know:
- Local mode reads **text-based PDFs only**, with no OCR. Scanned PDFs need their paid cloud version, which sends text to a third party. For HR data, start with local mode.
- Every question costs several AI calls, so it is slower (seconds, not milliseconds).
- Its published 98.7% result is on financial reports, from the vendor. We must measure it on **our** policies.
- The repo example uses an OpenAI key. We have not confirmed that it works with Groq models. Test this first.
- It does not fix the rules-versus-database problem.

How to test it: add it next to the current pipeline behind a switch, run the same 25 questions, and compare correct %, correct section cited, "not found" handling, time, and cost. Keep the winner, or combine them (PageIndex picks the section, keyword search confirms exact numbers). The same `run_eval.py` is used for both.

---

## 9. Sample data (to do)

Needed because the client demo runs on sample data:
- 4 to 6 realistic text PDFs with numbered clauses: leave, data privacy and retention, code of conduct, remote work, anti-harassment, and a version 2 of one policy (to test compare).
- A sample "company database" with tables and columns that match the rules (employees, training records, policy documents, access logs), including a few deliberate violations and some empty values.
- A larger question set (30 to 50) with correct answers and sections, including trick questions that are not in the policy.

---

## 10. Decisions already made

- **Focus on the RAG pipeline first.** The frontend is secondary.
- **Supabase later, not now.** Free plan (as of May 2026, check supabase.com/pricing again): 500 MB database, 1 GB storage, 2 free projects, 5 GB bandwidth. Two warnings: a free project **pauses after 7 days of no activity** (resume it before any demo) and has **no automatic backups**. pgvector on the free plan was not confirmed, so check it. A good use later: one project for the app tables, one as the sample company database. We delay it because PageIndex needs no vector database, and changing the database at the same time as fixing accuracy would give two things that can go wrong at once.
- **Frontend is plain HTML, CSS and JavaScript** because the team is not familiar with React.
- **Groq models:** `openai/gpt-oss-120b` for answers, `openai/gpt-oss-20b` for helper tasks.
- **Keep Chroma for now.**

---

## 11. Prompt for the next coding step (RAG steps 1 to 7)

Paste this into the code tool after the baseline is recorded. Ask it to give a short summary at the end and keep that summary in the repo notes.

```
Upgrade the RAG pipeline for accuracy. Work in the numbered stages below.
After EACH stage, re-run backend/tests/eval/run_eval.py and save the result
as results_stage1.json, results_stage2.json and so on. Show a table of
stage, correct %, number questions %, "not found" %, and average time.
If a stage makes the score worse, undo that stage and tell me why.
Keep API routes and response shapes unchanged (new fields are OK). Keep the
old code path behind RAG_MODE=legacy until I say it can be removed.
Do not touch the frontend.

STAGE 1: Make the Chroma collection use cosine distance. Rebuild the index
safely. Store the embedding model name in the collection metadata and
re-index automatically if it changes. Fix the score calculation and choose
the cutoff from real score numbers on the eval questions. Log the scores.

STAGE 2: Split policy text by section and clause headings first (like
"4.2 Maternity leave"), and by size only for long sections, with a small
overlap. Never cut a sentence. Put policy name, version, section title and
page in each chunk's metadata, and the section title at the start of the
chunk text.

STAGE 3: Compare all-MiniLM-L6-v2, BAAI/bge-small-en-v1.5 and
intfloat/e5-small-v2 on the eval set with the same chunks (use the query and
passage prefixes each model needs). Report hit rate in the top 5, correct
answer %, indexing time and speed. Keep the best as the default, set by an
environment variable.

STAGE 4: Add BM25 keyword search next to vector search and merge with
reciprocal rank fusion. Make the keyword weight a setting.

STAGE 5: Retrieve the top 20 from hybrid search, rerank with a small local
cross-encoder (for example cross-encoder/ms-marco-MiniLM-L-6-v2 or
BAAI/bge-reranker-base), keep the best 5. Make it switchable and report the
time cost.

STAGE 6: Use GROQ_ANSWER_MODEL for answers. The answer prompt must say:
answer ONLY from the provided excerpts; name the policy and section for
every claim; if the excerpts do not contain the answer reply exactly "Not
found in the provided documents."; if two excerpts conflict, say so. Use
low temperature. Return sources (policy, version, section, page, exact
sentence) with every answer. Optionally rewrite the question with
GROQ_FAST_MODEL before retrieval, switchable.

STAGE 7: If the best reranked score is below a tested threshold, skip the AI
call and return "Not found in the provided documents." Update the tests for
the new retrieval code. Write docs/RAG_PIPELINE.md in simple English.

At the end give a SMALL SUMMARY of at most 20 lines: the score table per
stage, which embedding model and reranker won, average answer time, the 3
questions that still fail and why, and anything not finished.
```

---

## 12. Notes for the teammate

- Groq's free tier has rate limits. If you see "rate limit", wait a minute and run again. It is not a code bug.
- The index lives in `backend/data/chroma`. If you change the embedding model or chunking, you must re-index.
- Keep a results file for every experiment. The numbers are what we show the client.
- Do not commit `.env`, API keys or real client data.
- If something here is out of date, update this file.