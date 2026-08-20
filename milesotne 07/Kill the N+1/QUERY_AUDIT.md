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

## Baseline Response Snapshots

The raw JSON responses captured before the fix were compared with the after-fix responses outside the repository. They contained 20 records for each endpoint.

## Required Follow-up

After the service changes, this document will record the one-query results, response-time measurements, and structural response verification for both endpoints.
