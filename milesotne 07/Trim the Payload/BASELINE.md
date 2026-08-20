# Payload Trim Baseline Comparison

This document records measurements from the supplied starter application before and after the performance hardening changes. Measurements were taken against the local SQLite database seeded with **550 orders**.

## Phase 1 — Before (broken endpoint)

- **Endpoint:** `GET /api/orders`
- **Raw response size:** `913,819 bytes` (**892.4 KiB**)
- **Response time:** `0.839186 seconds` (**839.2 ms**)
- **Orders returned:** 550
- **Fields returned per order:** 9 top-level keys, including `_metadata`; nested `user` returned 7 keys, each `items` row returned 6 keys, and each `product` returned 7 keys.
- **Content-Encoding:** none
- **Database queries:** 1,651 Prisma queries for one request: one base order query, 550 user queries, and 1,100 order-item queries.
- **Blocking work:** the route synchronously stalled for approximately 1 ms per order, or about 550 ms for this dataset, before serializing the response.
- **Frontend render note:** the starter did not include React Profiler instrumentation. The initial response contained all 550 orders and the UI rendered the entire collection in one pass.

The baseline was captured before changing the endpoint implementation. The exact curl output and response-shape observations were retained during the measurement session.

## Phase 2 — After Prisma select and pagination (without gzip)

- **Endpoint:** `GET /api/orders?page=1&limit=25` with `Accept-Encoding: identity`
- **Raw response size:** `17,861 bytes` (**17.4 KiB**)
- **Response time:** `0.005051 seconds` (**5.1 ms**)
- **Orders returned:** 25, with pagination metadata reporting all 550 records
- **Fields returned per order:** 6 top-level keys (`id`, `total`, `status`, `createdAt`, `user`, `items`); nested `user` has 4 keys, each `items` row has 4 keys, and each `product` has 2 keys (`name`, `image`).
- **Size reduction from Phase 1:** **98.05%**
- **Content-Encoding:** none
- **Database queries:** 5 Prisma query log entries for the request on the supplied SQLite database: one count query, one paginated order query, and three batched relation queries. The count is constant for the page rather than growing with the number of orders because the route no longer performs per-order queries.

## Phase 3 — After Prisma select, pagination, and gzip compression

- **Endpoint:** `GET /api/orders?page=1&limit=25` with `Accept-Encoding: gzip`
- **Compressed size:** `2,535 bytes` (**2.5 KiB**)
- **Response time:** `0.005337 seconds` (**5.3 ms**)
- **Content-Encoding:** `gzip` (verified in the response headers)
- **Size reduction from Phase 1:** **99.72%**
- **Size reduction from Phase 2:** **85.81%**
- **Database queries:** 5 Prisma query log entries, again independent of the number of returned orders.

## Summary

The measured response fell from **913,819 bytes** for 550 over-fetched orders to **17,861 bytes** for the first 25 explicitly selected orders, a **98.05%** reduction before compression. Gzip reduced the final wire payload to **2,535 bytes**, a **99.72%** reduction from the original response and an additional **85.81%** reduction from the trimmed response.

Sensitive and internal fields eliminated from the public payload include `updatedAt`, `userId`, `user.address`, `user.bio`, `user.role`, `product.description`, `product.stock`, `product.categoryId`, and the synthetic `_metadata` field. The frontend remains compatible with the selected public response shape; the only intentional UI change is adding pagination controls so the initial request does not load every order.
