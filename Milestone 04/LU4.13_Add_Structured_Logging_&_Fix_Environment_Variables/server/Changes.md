# Changes

## Problem analysis

The starter backend mixed vague `console.log` statements with swallowed exceptions. It also hardcoded the server port and relied on database configuration that was not documented as an environment contract. As a result, requests could not be correlated with application events, failures did not include useful stack information, and a clone could start with incomplete configuration and fail later at runtime.

## Implementation

The server now validates `DATABASE_URL`, `JWT_SECRET`, and `PORT` before creating a listener. Invalid or missing configuration produces a structured error and the process exits before accepting traffic. `NODE_ENV` has a development fallback because it is descriptive rather than required for safe startup.

Morgan is registered as request middleware and emits one JSON line per request containing an ISO timestamp, severity, request ID, HTTP method, path, status, duration, and response size. A shared logger emits JSON application events with timestamps and levels. Error objects include their name, message, and stack, while sensitive keys are redacted before serialization.

Controller catch blocks now record the request context and original error, then pass the failure to centralized Express error middleware. The middleware returns a request ID to the client so an incident can be matched to server logs. A single shared Prisma client is used by controllers and services, and Prisma reads its datasource URL from `env("DATABASE_URL")`.

The expense service validates descriptions, amounts, and payer IDs before persistence and rounds currency calculations to two decimal places. Results are ordered newest-first to make request output deterministic without changing the product scope.

A committed `.env.example` documents the required variables, while `.env`, local database files, and dependencies are ignored. No real credentials are included in the repository.

## Verification

The `npm run check` script performs Node syntax checks on the server bootstrap, configuration, logger, database module, controllers, and service. Startup validation was tested with no environment variables and is expected to fail before a listener is created. Database-backed endpoint verification requires a PostgreSQL instance populated through the Prisma migration workflow; the application reports a structured connection error when that dependency is unavailable rather than failing silently.
