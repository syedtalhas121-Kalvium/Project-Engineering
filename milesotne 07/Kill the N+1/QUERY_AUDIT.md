# QUERY_AUDIT.md

## Scope and Method

The baseline was captured with the starter service implementations unchanged. Prisma query logging was enabled in `lib/prisma.js`, the SQLite database was migrated and seeded with 20 posts and 20 orders, and each endpoint was requested once with `curl`. Counts below are the actual `prisma:query` log lines emitted for each request; response times are the corresponding `curl` `time_total` values.

## Before Fix

### GET /posts

DB queries for 20 records: **2**

Query breakdown:

- **1 ×** `SELECT` from `Post`
- **1 ×** batched `SELECT` from `User` for all 20 author IDs

Response time: **9.930 ms**

The service contained the N+1-shaped pattern at `src/services/postService.js:8-23`, with the per-post `prisma.user.findUnique()` call at lines 10-13. The installed Prisma client batches these concurrent `findUnique` calls into one `User` query in this run, so the observed baseline is 2 queries rather than 21. The code still performed an unnecessary second round trip; the eager-loading fix removes the per-record lookup.

### GET /orders

DB queries for 20 records: **21**

Query breakdown:

- **1 ×** `SELECT` from `Order`
- **20 ×** `SELECT` from `OrderItem` (one per order)

Response time: **5.606 ms**

The N+1 loop was at `src/services/orderService.js:8-14`, with the per-order `prisma.orderItem.findMany()` call at lines 9-12.

## After Fix

### GET /posts

DB queries for 20 records: **2**

Implementation: `prisma.post.findMany()` now uses `include.author` with a scoped `select` for `id`, `name`, and `email`. With this SQLite Prisma setup, the relation include is emitted as two SQL statements: one for posts and one batched query for all related users. There is no per-post query loop.

Response time before: **9.930 ms**

Response time after: **8.112 ms**

Measured timing improvement: **18% faster** in this single local request. The query count is unchanged from the already-batched baseline, but the service no longer relies on per-record lookup behavior and expresses the relation as one eager-loaded Prisma operation.

### GET /orders

DB queries for 20 records: **2**

Implementation: `prisma.order.findMany()` now uses `include.items` with a scoped `select` for `id`, `productName`, `quantity`, and `price`. The relation is loaded with one batched `OrderItem` query for all 20 orders instead of one query per order.

Response time before: **5.606 ms**

Response time after: **2.581 ms**

Measured timing improvement: **53% faster** in this single local request, with **19 fewer SQL queries** (21 → 2).

## API Response Verification

The before and after JSON files were compared programmatically after reseeding was not required and the underlying data remained unchanged.

| Endpoint | Before records | After records | Exact JSON equality | Top-level fields preserved |
| --- | ---: | ---: | --- | --- |
| `GET /posts` | 20 | 20 | ✅ Identical | ✅ `id`, `title`, `body`, `createdAt`, `author` |
| `GET /orders` | 20 | 20 | ✅ Identical | ✅ `id`, `reference`, `status`, `createdAt`, `items` |

The nested response structures are also identical. Posts retain the same author fields (`id`, `name`, `email`), and orders retain the same item fields (`id`, `productName`, `quantity`, `price`). The changes affect only how Prisma loads related data.

## Query Count Summary

| Endpoint | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| `GET /posts` | 2 | 2 | 0 SQL statements; per-record lookup removed |
| `GET /orders` | 21 | 2 | 19 SQL statements; 90% fewer |
