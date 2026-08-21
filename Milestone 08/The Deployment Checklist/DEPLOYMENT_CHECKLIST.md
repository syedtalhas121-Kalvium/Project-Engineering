# Deployment Checklist

**Application:** LaunchPad
**Platform:** Manus temporary public preview (backend and frontend exposed for verification)
**Live URL:** https://4173-innidkdyydm74th46exf6-08b8a9ee.sg1.manus.computer
**Checklist completed:** 2026-08-21
**Engineer:** syedtalhas121-Kalvium

---

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 01 | Env variables configured on platform | ✅ PASS | `screenshots/01-env-vars-platform.png` — redacted runtime manifest shows DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV, PORT, and VITE_API_BASE_URL. |
| 02 | Build passes locally | ✅ PASS | `screenshots/02-local-build.log` — Vite production build completed successfully; `dist/index.html` 0.51 kB and JavaScript bundle 172.79 kB. |
| 03 | Build passes in CI | ✅ PASS | [`Deployment Checklist CI`](https://github.com/syedtalhas121-Kalvium/Project-Engineering/actions/runs/32468482743) — successful run for commit `2648821`; it installed both workspaces and built with Node.js 22.13.0. |
| 04 | DB migrations executed | ✅ PASS | `screenshots/04-migration-log.log` — `prisma migrate deploy` reports one migration found and no pending migrations; the migration was applied during verification. |
| 05 | CORS verified | ✅ PASS | `screenshots/05-cors-network-tab.txt` and `evidence/public_demo_findings.txt` — public API requests returned HTTP 200 with `Access-Control-Allow-Origin` matching the public frontend. |
| 06 | API base URL correct in production | ✅ PASS | `screenshots/06-api-url.png` — production build uses the public backend URL, not localhost. |
| 07 | Auth flow tested in production | ✅ PASS | `screenshots/07-auth-production.webp` and `evidence/auth_findings.txt` — seeded admin login returned to the public dashboard with `Admin User (admin)` and the protected admin form visible. |
| 08 | Health endpoint responding | ✅ PASS | `GET https://3001-innidkdyydm74th46exf6-08b8a9ee.sg1.manus.computer/health` returned HTTP 200 and `{"status":"ok","database":"connected","timestamp":"2026-08-21T09:24:52.309Z"}`. |
| 09 | No secrets in Git | ✅ PASS | `screenshots/09-no-secrets-git.png` — no `.env` commits exist; the two historical `SECRET` matches are placeholders/fallback references from the starter code, not credentials, and `.env` is ignored. |
| 10 | .env.example committed | ✅ PASS | [`.env.example`](./.env.example) — all required keys are documented with placeholders. |
| 11 | Node version pinned | ✅ PASS | `backend/package.json` pins Node.js to `22.13.0`; `.github/workflows/ci.yml` uses the same version; `render.yaml` declares `NODE_VERSION=22.13.0`. |
| 12 | Docker image builds locally | ⏭️ SKIP | Docker is intentionally not used for this submission; `render.yaml` deploys the backend as a Node web service and the frontend as a static site. |

---

## Follow-up Tasks

No remaining FAIL items. The original gaps were resolved as follows:

- Item 05: CORS now reads the explicit `CORS_ORIGIN` environment variable.
- Item 06: The frontend uses `VITE_API_BASE_URL` and the production build was verified against the public backend URL.
- Item 08: Added a database-aware `GET /health` endpoint returning HTTP 200 when the database is reachable.
- Item 11: Pinned Node.js to `22.13.0` across backend package metadata, CI, and the Render Blueprint.

## Skip Justifications

- Item 12: Dockerization is intentionally out of scope because the checked-in deployment blueprint uses direct Node and static hosting. The repository contains no Docker runtime dependency, and the assignment explicitly permits a justified skip.
