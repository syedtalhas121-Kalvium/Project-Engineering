# Submission Evidence

## What is implemented

- `src/services/api.js` owns the Axios client, environment-based base URL, request authentication, and shared response normalization.
- The request interceptor adds `Authorization: Bearer <auth_token>` whenever `localStorage.auth_token` exists.
- The response interceptor handles `401`, `403`, `5xx`, and network failures with explicit, user-readable messages.
- All four assigned pages use named service functions; they do not call `fetch()`, read `localStorage`, or contain the FakeStore base URL.

## Verification commands

```bash
cp .env.example .env
npm install
npm run build
```

## Evidence to show in the walkthrough

1. Open the deployed app and DevTools → Network.
2. Set `localStorage.auth_token` in the console, reload, select a request to `fakestoreapi.com`, and show `Authorization: Bearer <token>` in Request Headers.
3. Visit the Products, Product Detail, Cart, and Profile routes and show successful requests.
4. Open `src/services/api.js` and point out the explicit `401`, `403`, `5xx`, and network branches in the shared response interceptor.
5. Show the pull-request commit history and the live deployment URL in `AUDIT_REPORT.md`.
