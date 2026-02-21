# User guide

## Two-step verification (2FA)

**How to access and enable 2FA**

1. Log in to the app.
2. In the **sidebar**, click **Profile** (user icon).
3. On the Profile page, scroll to the **Security** section (“Two-factor and session”).
4. Under **Two-factor authentication**, click **Enable 2FA**.
5. A dialog opens with a **secret** and a **QR code**. Open an authenticator app (e.g. **Google Authenticator** or **Microsoft Authenticator**) on your phone:
   - Either **scan the QR code**, or  
   - Manually **enter the secret** if your app supports it.
6. The app will show a **6-digit code** that changes every 30 seconds. Enter that code in the dialog and click **Verify**.
7. When verification succeeds, 2FA is on. Next time you log in, you’ll be asked for this code after your password.

To turn 2FA off later: go to **Profile → Security**, click **Disable 2FA**, and confirm.

---

## Training the RAG model with your own dataset

The app uses **RAG** (retrieval-augmented generation) so “Ask about compliance” can answer from policy content. You can feed that RAG with your own data in two main ways.

### Option 1: Company database (recommended for “Ask about compliance”)

When the app is set to use the company DB for Ask (default), answers are built from the **`policy_documents`** table in your connected company database (e.g. Dollar).

**To “train” RAG with a dataset (e.g. from Hugging Face or a CSV):**

1. **Get your data** into text (e.g. export from Hugging Face to CSV/text, or use any list of policy/compliance paragraphs).
2. **Insert rows** into the `policy_documents` table in the company DB. The table should have at least:
   - `id` (e.g. SERIAL PRIMARY KEY)
   - `content` (TEXT) – the actual policy or compliance text the model will search and use to answer.

Example (run in pgAdmin on your company database):

```sql
CREATE TABLE IF NOT EXISTS policy_documents (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT
);

-- Example: insert rows from your dataset (e.g. one row per document or chunk)
INSERT INTO policy_documents (title, content)
VALUES
    ('Doc 1', 'Your first policy or compliance text here...'),
    ('Doc 2', 'Your second document content...');
```

For a **Hugging Face dataset**: download or export the dataset (e.g. to CSV/JSON), then write a small script (Python/Node) or use pgAdmin to insert the relevant text column into `policy_documents.content`. The app does **not** read directly from Hugging Face; you copy the data into your DB.

3. **Connect the company database** in the app (Settings → Database) if not already connected.
4. Use **Ask about compliance**; your questions will be answered from the content in `policy_documents`.

### Option 2: Upload PDFs and reindex (Chroma RAG)

The app can also index **uploaded policy PDFs** into a vector store (Chroma). That content is used when the company DB has no results or when you scope a question to a policy.

**To add more “training” content via PDFs:**

1. Go to **Upload Policy** and upload PDFs that contain your compliance/policy text.
2. The backend extracts text, chunks it, and indexes it into Chroma (and extracts rules).
3. Optionally trigger a **reindex** (e.g. from Ask policy page or the reindex API) so all policies with extracted text are re-indexed.

This path is best when your dataset is in **PDF** form. For **Hugging Face or CSV datasets**, Option 1 (bulk insert into `policy_documents`) is simpler.

### Summary

| Goal | What to do |
|------|------------|
| Answers from your own text/dataset (e.g. from Hugging Face) | Put the text into the company DB table `policy_documents.content` (Option 1). |
| Answers from your own PDFs | Upload the PDFs in Upload Policy and use Chroma/reindex (Option 2). |

The **model** (Llama 3.3 70B via Groq) is fixed; “training” here means **adding the documents** the RAG retrieves from, not fine-tuning the LLM.
