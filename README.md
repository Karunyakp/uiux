# TrustLens AI: full stack (React + Express + SQLite)

Frontend: React + Vite (this folder). Backend: `backend/` (Node 22.13+, Express, built-in `node:sqlite`, no native compile step).
The only runtime dependency of the API is `express`.

## Run it

```bash
npm install                 # frontend deps
npm run server:install      # backend deps
cp backend/.env.example backend/.env   # optional; set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run server              # API on http://localhost:4000 (creates + seeds data/trustlens.db)
npm run dev                 # UI on http://localhost:5173 (proxies /api to :4000)
```

Production: `npm run build`, then `NODE_ENV=production JWT_SECRET=<long random> npm run server`.
The API serves `dist/` itself, so one process serves UI + API. `JWT_SECRET` is mandatory in production.

Tests: `npm run server:test`. If the API is not running, the UI falls back to the built-in sample data and says so.

## What the backend does

- Guest sessions created automatically; `POST /api/auth/register` upgrades a guest and keeps saved answers. Email + password login, scrypt hashing, HS256 tokens.
- Topics, evidence, sources and confidence data served in the exact shape the dashboard uses.
- Saved answers, issue reports, feedback, verification checklist progress and notifications, all per user.
- Follow-up questions answered only from published topics. If nothing matches, it says so (Low confidence, `grounded: false`) instead of guessing.
- Admin API (role `admin`): create/edit/delete topics (draft or published), add sources, attach evidence (optionally recompute confidence from the sources), triage reports (notifies the reporter), read feedback, stats, audit log.
- Safeguards: input validation, answer HTML sanitised to `<mark data-c>` only, rate limits, security headers, optional CORS, central error handling.

## API

| Method & path | Auth | Purpose |
|---|---|---|
| GET `/api/health` | – | Liveness |
| POST `/api/auth/guest` · `/register` · `/login` | – | Sessions |
| GET/PATCH `/api/auth/me` | user | Profile |
| GET `/api/topics?q=` · `/api/topics/:key` · `/api/sources` | – | Content |
| GET/POST `/api/topics/:key/followups` | user | Follow-up Q&A |
| GET `/api/me/saved` · PUT/DELETE `/api/me/saved/:key` | user | Saved answers |
| POST `/api/reports` `{topicKey, kind: wrong\|outdated\|missing, details}` | user | Report an issue |
| POST `/api/feedback` `{message, rating?}` | user | Feedback |
| GET `/api/checklist` · PUT `/api/checklist/:id` `{done}` | user | Verification Hub |
| GET `/api/notifications` · POST `/api/notifications/read` | user | Notifications |
| GET `/api/admin/stats` · `/topics` · `/reports?status=` · `/feedback` | admin | Admin reads |
| POST `/api/admin/topics` · PUT/DELETE `/api/admin/topics/:key` | admin | Manage topics |
| POST `/api/admin/sources` · `/api/admin/topics/:key/evidence` | admin | Sources & evidence |
| PATCH `/api/admin/reports/:id` `{status}` | admin | Triage |

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first start to get an admin account.

Seed content is sample data and has not been verified against the official GATE document.
