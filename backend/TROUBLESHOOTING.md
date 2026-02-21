# Backend troubleshooting

## "Connection refused" to localhost:5432 when starting the backend

**Error:**  
`psycopg2.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused. Is the server running on that host and accepting TCP/IP connections?`

**What it means:**  
The app is trying to connect to its **app database** (set by `DATABASE_URL` in `.env`) at startup. That database is separate from the **company database** (Dollar) you connect in Settings. The app **must** connect to the app database to start; if it can’t, Uvicorn exits with this error.

**Ways to fix it:**

### 1. PostgreSQL is on this computer (localhost)

- **Start PostgreSQL.**  
  - Windows: Services → start "postgresql-x64-…" or run `pg_ctl start` from your PostgreSQL bin folder.  
  - Mac: `brew services start postgresql` (or start from Postgres app).  
  - Linux: `sudo systemctl start postgresql`
- **Create the app database** (if it doesn’t exist):
  - Open psql or pgAdmin and connect to the same server (localhost, port 5432, user from `DATABASE_URL`).
  - Run: `CREATE DATABASE compliance_db;`  
  (Use the same database name as in your `DATABASE_URL`; the example uses `compliance_db`.)
- **Check `.env`:**  
  `DATABASE_URL` should look like:  
  `postgresql://USER:PASSWORD@localhost:5432/compliance_db`  
  Replace `USER`, `PASSWORD`, and `compliance_db` if you use different values.

### 2. PostgreSQL is on another machine (e.g. same server as Dollar/Pratham)

If your only PostgreSQL is on a remote host (e.g. the same server where you have the Dollar database):

- **Point `DATABASE_URL` to that host.**  
  In `backend/.env`, set for example:  
  `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST_OR_IP:5432/compliance_db`  
  Use the real hostname or IP (e.g. the one you use in pgAdmin for “Pratham”), port (usually 5432), and the same user/password that work in pgAdmin.
- **Create the app database on that server:**  
  In pgAdmin (or psql) connected to that server, run:  
  `CREATE DATABASE compliance_db;`  
  You can have both `compliance_db` (app) and `Dollar` (company) on the same PostgreSQL server.
- Restart the backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### Quick check

From a terminal (with PostgreSQL client installed):

- `psql -h localhost -p 5432 -U postgres -d postgres`  
  If this fails with “Connection refused”, PostgreSQL is not running on this machine or not listening on 5432. Start the service or use the host where PostgreSQL actually runs in `DATABASE_URL`.
