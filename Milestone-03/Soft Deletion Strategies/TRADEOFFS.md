# Soft-Deletion Trade-offs for LedgerApp

## Design summary

LedgerApp uses `deleted_at TIMESTAMPTZ DEFAULT NULL` on `users`, `accounts`, and `transactions`. A `NULL` timestamp identifies an active row; a non-`NULL` timestamp preserves both the record and the time at which the application removed it from normal views.

The route-level delete operations are idempotent from the active-record perspective: the first request sets `deleted_at`, while a repeated request finds no active row and returns `404`. Normal application queries include `deleted_at IS NULL`. Dedicated audit endpoints use `deleted_at IS NOT NULL` so compliance and recovery workflows can inspect the retained history.

## When soft delete is the right call

### 1. Preserving a user's financial history

A LedgerApp user may request account closure after having accounts and transactions recorded. Soft-deleting the user keeps the identity and its relationship history available without showing the user in ordinary active-user responses. The retained record can support an account-closure review, a dispute, or a request to restore an account during an approved recovery window.

### 2. Retaining accounts and transaction records for disputes

An account can have deposits, withdrawals, transfers, or other transaction events that must remain explainable after the account is no longer active. Soft-deleting the account hides it from normal account lists while preserving the linked transaction rows. This avoids the starter schema's cascading hard-delete behavior, in which deleting an account would also permanently remove its transactions.

### 3. Supporting operational recovery

An accidental delete is recoverable because the original row, identifiers, relationships, and `deleted_at` timestamp remain intact. A future recovery workflow can validate the request and set `deleted_at = NULL`, rather than reconstructing the record from incomplete logs or customer support notes.

## When hard delete is still appropriate

Soft deletion is not a universal retention policy. LedgerApp should still hard-delete data when a separate policy requires actual erasure or when the data has no audit value.

First, a verified privacy-erasure request may require the application to remove personal data from the database and all associated backups after the applicable retention obligation ends. In that workflow, a controlled purge job—not an ordinary user-facing route—should hard-delete or anonymize the eligible data, with the purge itself recorded in a minimal compliance log that does not retain the erased personal content.

Second, future operational tables such as expired session tokens, one-time verification codes, and temporary cache records should be hard-deleted. These records are short-lived, are not financial evidence, and can create unnecessary storage and security exposure if retained indefinitely. The current starter schema has no such table, so no table is excluded from this refactor.

Third, test fixtures and intentionally seeded development data should be purged between test runs. Keeping those rows as historical production-style records would pollute test results and make uniqueness, row counts, and repeatability harder to control.

## Compliance scenario

Assume a regulator asks LedgerApp to produce every transaction associated with user ID `4821` for the previous 36 months, including a transaction the user attempted to remove during that period. A normal product query must hide deleted transactions so the active application does not display them, but an authorized compliance workflow can use the audit route or an equivalent privileged query:

```sql
SELECT t.*
FROM transactions AS t
JOIN accounts AS a ON a.id = t.account_id
WHERE a.user_id = $1
  AND t.created_at >= CURRENT_TIMESTAMP - INTERVAL '36 months'
ORDER BY t.created_at ASC;
```

This query deliberately does not add `t.deleted_at IS NULL`, so it can return both active and soft-deleted financial records. The retained `deleted_at` timestamp shows when the record left the active view, while the transaction's amount, type, description, account reference, and creation time remain available as evidence. In a production system, this query must run behind authentication, least-privilege authorization, access logging, and a documented legal hold or retention policy.

## Storage growth estimate

Soft deletion trades immediate storage cleanup for recoverability. For an illustrative LedgerApp workload, assume 5,000 new transactions per month, 250 new accounts per month, and 100 new users per month. If 20% of each record type is deleted each month and retained indefinitely, the database will accumulate approximately the following rows after 24 months:

| Table | New rows per month | Total rows after 24 months | Approximate deleted rows at 20% | Approximate active rows |
|---|---:|---:|---:|---:|
| `users` | 100 | 2,400 | 480 | 1,920 |
| `accounts` | 250 | 6,000 | 1,200 | 4,800 |
| `transactions` | 5,000 | 120,000 | 24,000 | 96,000 |

At this rate, the transaction table grows by about 60,000 rows per year even if users only need the most recent active 96,000-row working set after two years. If the service later reaches 50,000 new transactions per month, the same retention pattern produces 1.2 million transaction rows in 24 months, including approximately 240,000 soft-deleted rows. Storage monitoring, archival, and a policy-driven hard-purge or anonymization process then become necessary.

## What the partial indexes solve

Without a partial index, an active-record query such as the following can require PostgreSQL to inspect a large portion of the table and discard historical rows whose `deleted_at` is not `NULL`:

```sql
SELECT *
FROM transactions
WHERE account_id = $1
  AND deleted_at IS NULL;
```

The schema creates `idx_transactions_active_account` with `WHERE deleted_at IS NULL`, so the index contains only active transaction rows for account lookups. Equivalent active-row indexes exist for all three tables, with a user and account relationship index for the common foreign-key filters. The index does not remove storage growth, but it keeps the active working set smaller and avoids repeatedly scanning retained history.

For this simple service, performance may remain acceptable below roughly 100,000 rows per table with selective identifiers and low concurrency, even without a partial index. Once a high-write table reaches several hundred thousand to one million rows, or once active-row queries run many times per second, unindexed soft-delete predicates can become a measurable latency and I/O concern. The exact threshold depends on row width, query selectivity, cache size, vacuum health, and workload, so production should validate the estimate with `EXPLAIN (ANALYZE, BUFFERS)` and representative data.

## Operational follow-up

Soft deletion should be paired with a retention policy. LedgerApp should monitor table size and index size, record who initiated each deletion, protect audit endpoints with role-based access control, and define when records are archived, anonymized, or permanently purged. The application currently provides the retained data model and query separation; those governance controls are production follow-up work.
