# Pre-Refactor Hard-Delete Audit

This audit was created before the schema and route refactor. The starter code contains three explicit `DELETE FROM` statements. Each one permanently removes data and, because of the foreign-key cascades in `schema.sql`, may also remove dependent records.

| File and original line | Table affected | Hard-delete statement | Data permanently lost | Refactor action |
|---|---|---|---|---|
| `routes/users.js:44` | `users` | `DELETE FROM users WHERE id = $1` | The user's account-holder record, including name, email, and creation timestamp. The `accounts.user_id ... ON DELETE CASCADE` relationship also causes the user's accounts—and their transaction history through `accounts`—to be removed by PostgreSQL. | Add `users.deleted_at`; update the route to timestamp the row instead of deleting it; filter normal user reads to active rows. |
| `routes/accounts.js:43` | `accounts` | `DELETE FROM accounts WHERE id = $1` | The bank account record, including account type, balance, and creation timestamp. The `transactions.account_id ... ON DELETE CASCADE` relationship also causes every transaction belonging to the account to be removed. | Add `accounts.deleted_at`; update the route to timestamp the row; filter normal account reads to active rows. |
| `routes/transactions.js:43` | `transactions` | `DELETE FROM transactions WHERE id = $1` | The individual financial transaction, including amount, type, description, account reference, and creation timestamp. Once removed, it cannot support recovery, dispute handling, or an audit response. | Add `transactions.deleted_at`; update the route to timestamp the row; filter normal transaction reads to active rows. |

## Tables intentionally included

All three application tables are included because each has an explicit hard-delete endpoint. No table is excluded from the soft-delete schema change. The starter repository has no session-token, one-time-code, or temporary-cache table where permanent deletion would be the correct default.

## Cascade-risk note

The starter schema uses `ON DELETE CASCADE` on `accounts.user_id` and `transactions.account_id`. The soft-delete routes no longer invoke those database cascades. Consequently, the parent and child records remain available for the audit route, while ordinary application reads hide records whose `deleted_at` is not `NULL`.

This file is intended to be committed before any schema or route changes, as required by the assignment.
