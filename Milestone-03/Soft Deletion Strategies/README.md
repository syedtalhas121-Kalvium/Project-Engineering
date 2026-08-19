# LedgerApp — Financial Record Management API

LedgerApp is a small Express and PostgreSQL API for managing users, bank accounts, and financial transactions. This version uses **soft deletion** for all three business tables: deleting a record sets `deleted_at` instead of removing the row, so the record remains available for recovery and audit workflows.

## Live Deployment

[https://3000-i2gbfrmfvncc65jg63x4l-2aaf6cf0.us3.manus.computer](https://3000-i2gbfrmfvncc65jg63x4l-2aaf6cf0.us3.manus.computer) — temporary public deployment for verification. The root health endpoint is available at `/`; database-backed routes require the configured PostgreSQL service.

## Getting Started

### Prerequisites

- Node.js v18 or newer
- PostgreSQL v14 or newer

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database called `ledgerapp`.

3. Initialize the schema:

   ```bash
   psql -d ledgerapp -f schema.sql
   ```

4. Create a `.env` file from `.env.example` and set `DB_URL` to the PostgreSQL connection string. Set `PORT` if the service should listen on a port other than `3000`.

5. Start the application:

   ```bash
   npm start
   ```

## Soft-Delete Design

The `users`, `accounts`, and `transactions` tables each contain `deleted_at TIMESTAMPTZ DEFAULT NULL`. A `NULL` value means that the row is active. A timestamp means that the row has been soft-deleted and records when the deletion occurred.

The `DELETE` endpoints now execute an `UPDATE ... SET deleted_at = NOW()` operation. Normal list and detail endpoints add `deleted_at IS NULL`, while dedicated audit endpoints return only deleted records.

The schema retains the starter foreign-key cascade definitions for any deliberate database-level hard purge. The application delete routes do not trigger those cascades, which preserves parent and child records for audit purposes.

## API Endpoints

### Health

- `GET /` — Confirm that the API is running.

### Users

- `GET /users` — List active users.
- `GET /users/:id` — Get one active user.
- `GET /users/audit/deleted` — List soft-deleted users for audit and recovery workflows.
- `POST /users` — Create a user.
- `DELETE /users/:id` — Soft-delete a user.

### Accounts

- `GET /accounts` — List active accounts.
- `GET /accounts/user/:userId` — List active accounts for a user.
- `GET /accounts/audit/deleted` — List soft-deleted accounts for audit and recovery workflows.
- `POST /accounts` — Create an account.
- `DELETE /accounts/:id` — Soft-delete an account.

### Transactions

- `GET /transactions` — List active transactions.
- `GET /transactions/account/:accountId` — List active transactions for an account.
- `GET /transactions/audit/deleted` — List soft-deleted transactions for audit and recovery workflows.
- `POST /transactions` — Create a transaction.
- `DELETE /transactions/:id` — Soft-delete a transaction.

> The audit endpoints are intentionally demonstrated as open routes for this learning assignment. In a production deployment they must be protected by authentication and an administrator or compliance role.

## Performance Considerations

Each soft-deleted table has a partial index for active rows. These indexes prevent normal active-record lookups from scanning the full historical table as deleted rows accumulate. Additional partial indexes on `accounts.user_id` and `transactions.account_id` support the two most common filtered relationship queries.

The design analysis and retention estimates are documented in [TRADEOFFS.md](TRADEOFFS.md). The pre-refactor hard-delete inventory is documented in [AUDIT.md](AUDIT.md).

## Project Structure

- `app.js` — Express application initialization and middleware setup.
- `db.js` — PostgreSQL connection pool management through `pg`.
- `schema.sql` — Users, accounts, transactions, soft-delete columns, and partial indexes.
- `routes/` — REST endpoints for each entity.
- `AUDIT.md` — Pre-refactor hard-delete audit, committed before the implementation changes.
- `TRADEOFFS.md` — Design reasoning, performance estimates, and compliance scenario.

## Tech Stack

- Node.js and Express
- PostgreSQL
- `pg` for parameterized SQL queries
- `dotenv` for environment configuration
