# Backend-to-Frontend Integration Guide

This document describes how to connect your backend API to this frontend and lists every endpoint the app expects.

---

## 1. Connect the frontend to your backend

### Step 1: Set the API base URL

Create or edit `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Replace with your backend base URL (no trailing slash). Examples:

- Local: `http://localhost:8000`
- Staging: `https://api-staging.example.com`
- Production: `https://api.example.com`

Restart the Next.js dev server after changing this variable.

### Step 2: CORS

Allow the frontend origin in your backend CORS configuration. For local dev, allow:

- `http://localhost:3000` (or the port where Next.js runs)

For production, allow your frontend origin (e.g. `https://app.example.com`).

Allow methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.  
Allow headers: `Content-Type`, `Authorization`.

### Step 3: Auth (JWT)

- **Login:** Frontend sends `POST /auth/login` with `{ "email", "password", "role?" }`. Backend returns `{ "user": {...}, "token": "<jwt>" }`. Frontend stores the token in `localStorage` under `auth_token`.
- **Authenticated requests:** Frontend sends `Authorization: Bearer <token>` on all requests except login and health.
- **Logout:** Frontend calls `POST /auth/logout` with the Bearer token (for audit), then clears the token locally.

Implement JWT validation on the backend for all protected routes; return `401` when the token is missing or invalid so the frontend can redirect to login.

---

## 2. API endpoints the frontend uses

Below, **Auth** means the frontend sends `Authorization: Bearer <token>`. **No auth** means the endpoint is called without the header. Error responses should use a JSON body with a `detail` field (string or array of objects with `msg`) so the frontend can show a clear message.

---

### Health (no auth)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/health` | — | `{ "status"?: string }` (e.g. `"ok"`). Frontend expects 2xx and JSON. |

---

### Auth

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/auth/login` | `{ "email": string, "password": string, "role"?: string }` | `{ "user": object, "token": string }` |
| POST | `/auth/logout` | — (Auth) | Any 2xx; frontend clears token anyway. |
| GET | `/auth/me` | — (Auth) | `{ "user": { "id", "email", "name", "role", "department", "two_fa_enabled" } }` |
| POST | `/auth/2fa/enable` | — (Auth) | `{ "secret": string, "qr_uri": string }` |
| POST | `/auth/2fa/verify` | `{ "code": string }` (Auth) | `{ "enabled": boolean }` |
| POST | `/auth/2fa/disable` | — (Auth) | `{ "enabled": boolean }` |

---

### Dashboard & scan

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/dashboard/summary` | — (Auth) | See **Dashboard summary** below. |
| POST | `/scan/run` | — (Auth) | `{ "message"?, "rules_checked", "total_violations", "resolved_count"?, "by_rule"?, "scan_duration_seconds"? }` |

**Dashboard summary** (GET `/dashboard/summary`):

```json
{
  "total_policies": number,
  "total_rules": number,
  "total_violations": number,
  "pending_violations": number,
  "high_severity": number,
  "recent_violations": [
    {
      "id": number,
      "rule_id": number,
      "record_id": string,
      "status": string,
      "severity": string | null,
      "explanation": string,
      "detected_at": string | null
    }
  ],
  "last_scan_timestamp": string | null,
  "last_scan_status": string | null,
  "total_violations_found": number,
  "scan_duration_seconds": number | null,
  "last_scan_created_at": string | null
}
```

---

### Violations

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/violations` | Query: `severity` (optional) (Auth) | Array of **Violation** objects. |
| PATCH | `/violations/:id` | `{ "status": "approved" | "dismissed", "reviewer_notes"?: string }` (Auth) | 2xx; frontend sends `rejected` as `dismissed`. |

**Violation** (backend shape):

```json
{
  "id": number,
  "rule_id": number,
  "policy_id": number | null,
  "policy_name": string | null,
  "record_id": string,
  "status": string,
  "severity": string | null,
  "explanation": string,
  "suggested_remediation": string | null,
  "policy_clause_text": string | null,
  "evidence_snapshot": any,
  "detected_at": string | null,
  "created_at": string | null,
  "reviewer_notes": string | null
}
```

---

### Rules

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/rules` | Query: `severity` (optional) (Auth) | Array of **Rule** objects. |
| POST | `/rules` | `{ "policy_id": number, "severity"?: string, "policy_clause_text"?: string }` (Auth) | Single **Rule** object. |
| PATCH | `/rules/:id` | `{ "status": "active" | "inactive" }` (Auth) | 2xx. |
| DELETE | `/rules/:id` | — (Auth) | 2xx. |

**Rule** (backend shape):

```json
{
  "id": number,
  "policy_id": number,
  "policy_name": string | null,
  "rule_data": any,
  "severity": string,
  "status": "active" | "inactive",
  "created_at": string | null,
  "policy_clause_text": string
}
```

---

### Policy

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/policy` | — (Auth) | Array of **Policy** objects. |
| POST | `/policy/upload` | `multipart/form-data`: `file` (PDF) (Auth) | Array of `{ "id": number, "policy_clause_text"?: string, "severity": string }`. |
| GET | `/policy/compare` | Query: `old_policy_id`, `new_policy_id`, `compute_impact` ("true"|"false") (Auth) | **PolicyCompareResult** (see below). |
| GET | `/policy/rag-status` | — (Auth) | `{ "indexed_count", "total_with_text", "rag_available"?, "hint"? }`. |
| POST | `/policy/reindex` | — (Auth) | `{ "indexed", "total_with_text", "rag_available"?, "hint"? }`. |
| POST | `/policy/ask` | `{ "query": string, "policy_id": number | null }` (Auth) | `{ "answer": string }`. |

**Policy** (backend shape):

```json
{
  "id": number,
  "name": string,
  "version": number,
  "is_active": boolean,
  "uploaded_at": string | null,
  "rules_count": number
}
```

**PolicyCompareResult**:

```json
{
  "old_policy": { "id", "name", "version" },
  "new_policy": { "id", "name", "version" },
  "only_in_old": [ { "id", "policy_id", "rule_data", "severity", "policy_clause_text" } ],
  "only_in_new": [ ... ],
  "in_both": [ ... ],
  "impact": { "new_violations_count": number | null, "message": string }
}
```

---

### Database (Settings)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/database/status` | — (Auth) | `{ "connected": boolean, "host"?, "db_name"?, "username"?, "port"? }`. |
| POST | `/database/connect` | `{ "host", "username", "password", "db_name" }` (Auth) | `{ "message": string }`. |

---

### Settings

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/settings` | — (Auth) | Flat object of setting keys to string values (e.g. `scan_frequency`, `severity_threshold`, `email_alerts`, `slack_webhook`, `ai_model`, `confidence_threshold`, `policy_upload_max_file_size_mb`, `policy_upload_max_per_hour`, `zip_upload_max_size_gb`). |
| PATCH | `/settings` | Partial object of same keys; numbers/booleans as needed (Auth) | Same shape as GET. |

---

### Notifications

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/notifications` | — (Auth) | Array of `{ "id", "type", "title", "body"?, "read", "created_at"? }`. `type`: "critical" \| "warning" \| "success" \| "info". |
| PATCH | `/notifications/:id/read` | — (Auth) | 2xx. |

---

### Users (admin)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/users` | — (Auth, admin) | Array of `{ "id", "email", "name", "role", "department", "two_fa_enabled", "created_at"? }`. |
| POST | `/users` | `{ "email", "name", "role"?, "department"?, "password"? }` (Auth, admin) | `{ "id", "email", "name", "role", "department" }`. |
| PATCH | `/users/:id/password` | `{ "password": string }` (Auth, admin) | User object. |
| DELETE | `/users/:id` | — (Auth, admin) | `{ "ok": boolean, "id": number }`. |

---

### Profile & activity

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/profile/metrics` | — (Auth) | `{ "logins", "reports_viewed", "exports" }` (numbers). |
| POST | `/profile/track` | `{ "action_type": string }` (e.g. `"report_viewed"`) (Auth) | 2xx. |
| GET | `/profile/activity` | Query: `limit`, `hours` (Auth) | Array of `{ "id", "action_type", "entity_type"?, "entity_id"?, "performed_by"?, "timestamp"?, "meta"? }`. |

---

### Reports

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/reports/export/pdf` | — (Auth) | Binary PDF; `Content-Disposition: attachment; filename="..."`. |
| GET | `/reports/export/csv` | — (Auth) | Binary CSV; `Content-Disposition: attachment; filename="..."`. |

---

## 3. Frontend behavior when backend is not set

- If `NEXT_PUBLIC_API_URL` is not set (or empty), the app uses **demo/mock data** and does not call the backend. Login may set a session flag so the app stays in “demo mode” for that tab even if the env is later set.
- Settings, Rules, Violations, Dashboard, etc. still work with mock data so you can develop and demo the UI without a backend.

---

## 4. Timeouts and long-running requests

The frontend uses these timeouts so the UI does not hang:

- **Health:** 8 s  
- **Scan run:** 2 min  
- **Policy ask:** 2 min  
- **Policy reindex:** 3 min  
- **Policy upload:** 3 min  
- **Rule delete:** 15 s  

Ensure your backend can handle long-running work (e.g. scan, reindex, upload) and returns a response within these limits, or the frontend will show a timeout error (and may abort the request).

---

## 5. Cache and performance (frontend)

- The frontend caches **dashboard summary**, **notifications**, **violations** (per filter), and **rules** (per filter) in memory and in `sessionStorage` for 60 seconds.
- **Stale-while-revalidate:** If cached data exists but is older than 60 s, the UI shows it immediately and refetches in the background so repeat visits feel fast.
- After mutations (e.g. create/delete rule), you can invalidate cache by calling `invalidateCached(cacheKeyRules(...))` and then `refetch()` from the hook if needed; the current app already calls `refetch()` after mutations where it matters.

---

## 6. Checklist for backend implementers

1. [ ] Set up CORS for the frontend origin(s).  
2. [ ] Implement `GET /health` (no auth).  
3. [ ] Implement `POST /auth/login` and return JWT; validate JWT on all other endpoints (except health).  
4. [ ] Implement `GET /dashboard/summary` and `POST /scan/run`.  
5. [ ] Implement `GET/PATCH /violations` and `GET/POST/PATCH/DELETE /rules`.  
6. [ ] Implement `GET /policy`, `POST /policy/upload`, `GET /policy/compare`, `GET /policy/rag-status`, `POST /policy/reindex`, `POST /policy/ask`.  
7. [ ] Implement `GET/PATCH /settings`, `GET /database/status`, `POST /database/connect`.  
8. [ ] Implement `GET/PATCH /notifications`, `GET/POST/PATCH/DELETE /users` (admin).  
9. [ ] Implement `GET /auth/me`, `POST /auth/logout`, and 2FA endpoints if you need them.  
10. [ ] Implement `GET /profile/metrics`, `POST /profile/track`, `GET /profile/activity`.  
11. [ ] Implement `GET /reports/export/pdf` and `GET /reports/export/csv`.  
12. [ ] Use consistent error responses with a `detail` field (string or list of `{ msg }`) for 4xx/5xx so the UI can display messages.

Once the above are in place, set `NEXT_PUBLIC_API_URL` in the frontend and the app will use your backend for all operations.
