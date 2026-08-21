# LinkShelf Deployment Debugging Log

## 1. What Failed?

The supplied challenge fixture contained three independent production failures. The frontend displayed the following warning because the Vite variable was absent during the static build:

```text
API URL: ⚠️ undefined (VITE_API_URL not set!)
```

A login attempt then targeted an invalid API URL and could not reach the backend:

```text
POST https://linkshelf-frontend.onrender.com/undefined/api/auth/login
```

Once the frontend API URL was corrected, the browser rejected the cross-origin request because the API returned a wildcard origin while the request included credentials/authentication headers:

```text
Access to fetch at 'https://linkshelf-api.onrender.com/api/auth/login'
from origin 'https://linkshelf-frontend.onrender.com' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: The value of the
'Access-Control-Allow-Origin' header in the response must not be the wildcard '*'
when the request's credentials mode is 'include'.
```

The backend deployment also omitted Prisma client generation. Consequently, the service could start and respond to a health check, but the first database-backed request could fail with:

```text
PrismaClientInitializationError: Prisma Client has not been generated yet.
Please run 'prisma generate' and try to import it again.
```

## 2. Root Cause Analysis

| # | Issue Found | File(s) Affected | Why It Caused a Failure |
|---|---|---|---|
| 1 | `VITE_API_URL` was not configured for the static frontend service. | `render.yaml`, `frontend/src/config.js` | Vite substitutes `VITE_*` variables during `npm run build`. With no value present at build time, `API_URL` compiled as undefined and the frontend constructed invalid request URLs. |
| 2 | The API used `origin: "*"` without enabling a specific credentialed origin. | `src/index.js`, `render.yaml` | Browsers do not permit `Access-Control-Allow-Origin: *` for credentialed cross-origin requests. The API also had no configured frontend origin to return in the CORS response. |
| 3 | Prisma client generation was absent from the backend build command. | `render.yaml`, `prisma/schema.prisma` | Installing dependencies does not create the generated Prisma client artifacts. Database routes such as login and bookmark creation can therefore fail at runtime even when the process and health endpoint start successfully. |

## 3. Fixes Applied

### Fix 1 — CORS Configuration

`src/index.js` now validates `CORS_ORIGIN` at startup and passes `process.env.CORS_ORIGIN` to the CORS middleware. `credentials: true` remains enabled, and the allowed methods and headers are unchanged. The frontend URL is therefore supplied through deployment configuration rather than hardcoded in backend logic.

### Fix 2 — Frontend Build Environment

`render.yaml` now defines `VITE_API_URL` on the static frontend service as `https://linkshelf-api.onrender.com`. It also defines the backend's `CORS_ORIGIN` as `https://linkshelf-frontend.onrender.com`. These values are available to the correct service at the correct phase: the frontend value is injected before the Vite build, while the backend value is read when the Node process starts.

### Fix 3 — Build Command

The backend build command now runs:

```yaml
buildCommand: npm install && npx prisma generate
```

This compiles the Prisma client before the service starts and before any request can execute a database query.

## 4. Verification

The following checks were used to verify the corrected configuration:

- **Configuration inspection:** `src/index.js` contains no wildcard CORS origin; it uses `process.env.CORS_ORIGIN` and keeps `credentials: true`.
- **Backend build configuration:** `render.yaml` contains `npm install && npx prisma generate`.
- **Frontend build configuration:** `render.yaml` defines `VITE_API_URL` before `npm run build` executes.
- **Preflight OPTIONS request:** With the backend running and `CORS_ORIGIN` set to the frontend origin, an OPTIONS request returns the specific `Access-Control-Allow-Origin` value and `Access-Control-Allow-Credentials: true` instead of `*`.
- **API call:** The corrected frontend targets `https://linkshelf-api.onrender.com` and can issue the login and bookmark API requests without the wildcard-origin rejection, subject to valid database credentials and deployment availability.
- **Render deploy log:** The backend build step explicitly generates the Prisma client before startup.

## 5. Key Takeaways

A React/Vite frontend is a static artifact, so `VITE_*` values must exist before the build; adding them after the bundle is created cannot change the already compiled JavaScript. Credentialed CORS requests require a specific allowed origin, not `*`, and Prisma client generation is a build-time requirement rather than something that happens merely because the schema is committed to source control.

## References

1. [MDN Web Docs — CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
2. [Vite — Env Variables and Modes](https://vite.dev/guide/env-and-mode)
3. [Prisma — `prisma generate` reference](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#generate)
