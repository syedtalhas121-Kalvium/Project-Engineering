# TrackFlow API

TrackFlow is an event tracking and analytics API for SaaS products. This implementation addresses the large-scale growth challenge with **monthly range partitioning**, a **90-day archive policy**, and explicit **primary/replica query routing**.

## Live Deployment

The repository is public at [syedtalhas121-Kalvium/Project-Engineering](https://github.com/syedtalhas121-Kalvium/Project-Engineering). The API can be deployed to Render or Railway using the root of this challenge directory, with `npm install` as the build command and `npm start` as the start command. Configure `PRIMARY_DB_URL` and `REPLICA_DB_URL`; both may point to the same PostgreSQL instance for a demo.

## Getting Started

### Prerequisites

Node.js v18 or later and PostgreSQL v14 or later are required.

### Installation

1. Clone the repository and enter this directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file from `.env.example`. For local development, both database variables may use the same database:

   ```env
   PRIMARY_DB_URL=postgres://user:password@localhost:5432/trackflow
   REPLICA_DB_URL=postgres://user:password@localhost:5432/trackflow
   PORT=3000
   ```

   `DATABASE_URL` remains supported as a legacy fallback for the primary connection.

4. Initialize the database schema:

   ```bash
   psql -d trackflow -f schema.sql
   ```

5. Start the server:

   ```bash
   npm start
   ```

### Archive job

Run `archive-events.sql` nightly from a trusted scheduler, for example at 02:15 UTC:

```cron
15 2 * * * psql "$PRIMARY_DB_URL" -v ON_ERROR_STOP=1 -f archive-events.sql
```

The job moves raw events older than 90 days to `events_archive`. Compliance queries that span the retention boundary should use the `UNION ALL` pattern documented in that file.

## API Endpoints

| Method | Route | Database target | Purpose |
| --- | --- | --- | --- |
| `POST` | `/events` | Primary | Ingest an event. |
| `GET` | `/events?user_id={id}` | Replica | Return the latest 100 events for a user. |
| `POST` | `/sessions/start` | Primary | Start a session. |
| `GET` | `/sessions/active` | Replica | List sessions without an end time. |
| `GET` | `/metrics/monthly` | Replica | Aggregate event types from the last 30 days. |
| `POST` | `/metrics/feature-usage` | Primary | Record a feature interaction. |
| `GET` | `/health` | None | Return API health status. |

## Growth Context

The challenge starts with 50,000 active users, 200 events per user per day, 10,000,000 event rows added per day, 45,000,000 current event rows, and projected monthly growth of 300,000,000 rows. See [GROWTH-ANALYSIS.md](./GROWTH-ANALYSIS.md) for arithmetic, thresholds, and route-level risks. See [SCALE-PLAN.md](./SCALE-PLAN.md) for the complete architecture plan and rollout order.

---

Developed for the Engineering Challenge on Large-Scale Data Growth Strategies.
