# Roommate Expense Wars Backend

This backend tracks shared roommate expenses, returns balances, and exposes a small Express API. It is configured for predictable local and production startup with environment-backed configuration and structured observability.

The implementation focuses on reliability, debuggability, and portability without expanding the product scope.

## 🎯 Project Goals

The objective of this challenge is not to build features, but to improve the **reliability**, **debuggability**, and **configurability** of the system.

## 🛠 Setup Instructions

From this directory, install dependencies and create a local configuration file:

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` to a PostgreSQL database, replace `JWT_SECRET` with a long random value, and choose an available `PORT`. Then generate the Prisma client and apply the migration:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The process fails before listening if `DATABASE_URL`, `JWT_SECRET`, or `PORT` is missing or invalid. `NODE_ENV` defaults to `development` when omitted.

## Implementation summary

The server now validates its required environment variables before booting, loads the Prisma datasource from `DATABASE_URL`, and uses `PORT` rather than a source-level constant. Morgan and the shared JSON logger provide request and application visibility with request IDs, durations, statuses, and serialized stack traces. Controllers pass failures to centralized Express error middleware, which returns a safe error body containing the correlation ID.

The committed `.env.example` documents the configuration contract, while `.env`, local databases, and dependencies are excluded from version control. See [`Changes.md`](./Changes.md) for the reasoning and verification record.
