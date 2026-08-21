# Monitor & Debug Log

**Engineer:** Syed Talha / Manus-assisted implementation
**Date:** 21 August 2026
**Endpoint:** `GET /api/products`
**Evidence scope:** Local production-mode verification. Render deployment was not completed because the Render account was unavailable in the working session.

## Before

The starter application had no Morgan middleware, so an HTTP request produced no request-level log line. The original controller also always queried with `{ category: req.query.category }`. When `category` was omitted, the value was `undefined`, and the database query returned an empty array with HTTP 200 rather than surfacing an error.

This was verified from the starter source at `src/controllers/productController.js:6` and `src/server.js` before the fix. Because the Render dashboard could not be accessed, this document does **not** claim that a production Render log was observed.

## Morgan Log Line

Morgan was installed and registered before the product routes in `src/server.js`. With `NODE_ENV=production`, the local verification harness made the real HTTP request and captured these exact combined-format lines:

```text
::ffff:127.0.0.1 - - [21/Aug/2026:09:32:33 +0000] "GET /api/products HTTP/1.1" 200 624 "-" "node"
::ffff:127.0.0.1 - - [21/Aug/2026:09:32:33 +0000] "GET /api/products?category=electronics HTTP/1.1" 200 264 "-" "node"
```

The first response was **624 bytes** and contained 10 products. The second response was **264 bytes** and contained the 4 electronics products. The important diagnostic contrast is that the broken starter behavior would have returned `[]` at 2 bytes, while the corrected no-filter request returns real data.

## Root Cause

The root cause was in `src/controllers/productController.js:6`. The starter code always passed `{ category: req.query.category }` to `Product.find`. For `GET /api/products`, no category exists in the query string, so the filter became `{ category: undefined }`. That condition matched no products while still producing a successful response, making the failure silent.

The second visibility problem was in `src/server.js`: Morgan was absent, so the request method, path, status, and response size were not visible in the service logs. The controller catch block also returned a 500 response without calling `console.error`.

## The Fix

The implementation makes the query filter conditional. It uses `{ category }` only when a category was supplied and uses `{}` for the unfiltered endpoint. It also adds Morgan before `/api/products`, selecting `combined` in production and `dev` elsewhere. Every relevant catch block now emits a structured `console.error` message with useful context before sending the error response.

A `createApp` factory and `scripts/local-verification.mjs` were added so the real Express route can be tested through HTTP without requiring a database connection. The verification harness uses the same production middleware and route path; its model is a deterministic local test double, not fabricated production evidence.

## After Fix

The local production-mode verification completed successfully:

```text
Verified GET /api/products returned 10 products.
Verified GET /api/products?category=electronics returned 4 products.
```

The response-size evidence changed from the starter’s expected empty JSON array size of **2 bytes** to **624 bytes** for the unfiltered response. The exact local Morgan line after the fix is the first line in the Morgan section above.

## Key Learning

A successful HTTP status does not prove that an endpoint returned useful data. Request logging makes status and response size observable, while explicit error logging preserves the evidence needed to diagnose failures inside handlers and database connection code. The remaining production step is to deploy the branch to Render, set `NODE_ENV=production`, and replace the local evidence above with the corresponding Render log lines.
