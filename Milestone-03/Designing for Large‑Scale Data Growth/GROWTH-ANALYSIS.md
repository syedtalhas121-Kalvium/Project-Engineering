# TrackFlow Growth Analysis

## Scope and projection method

TrackFlow currently serves **50,000 active users** who generate **200 events per user per day**, which is **10,000,000 new event rows per day**. The README also states a projected monthly growth of **300,000,000 event rows** and a current `events` table size of **45,000,000 rows**, representing approximately 4.5 days of traffic. The projections below use the README's explicit monthly rate so that the arithmetic is reproducible:

```text
Projected rows at month N = current rows + (300,000,000 × N)
```

The README does not provide current row counts or creation rates for `sessions` and `feature_usage`. To make those projections transparent rather than inventing hidden data, this analysis uses a conservative operating assumption of **one session row and one feature-usage row per active user per day**. That yields 50,000 rows per day, 1,500,000 rows per 30-day month, and an estimated 225,000 current rows over the same 4.5-day observation window. If production telemetry shows a different rate, the session and feature-usage projections should be recalculated by replacing the 50,000-row daily assumption; the events projection is unaffected.

## Growth projections

| Table | Current baseline | Monthly growth used | 12 months | 24 months | 36 months |
| --- | ---: | ---: | ---: | ---: | ---: |
| `events` | 45,000,000 | 300,000,000 | 3,645,000,000 | 7,245,000,000 | 10,845,000,000 |
| `sessions` | 225,000 | 1,500,000 | 18,225,000 | 36,225,000 | 54,225,000 |
| `feature_usage` | 225,000 | 1,500,000 | 18,225,000 | 36,225,000 | 54,225,000 |

The `events` calculations are:

```text
12 months = 45,000,000 + (300,000,000 × 12) = 3,645,000,000
24 months = 45,000,000 + (300,000,000 × 24) = 7,245,000,000
36 months = 45,000,000 + (300,000,000 × 36) = 10,845,000,000
```

The `sessions` and `feature_usage` calculations use the documented assumption:

```text
Current baseline = 50,000 users × 4.5 days = 225,000 rows
Monthly growth = 50,000 users × 30 days = 1,500,000 rows
12 months = 225,000 + (1,500,000 × 12) = 18,225,000
24 months = 225,000 + (1,500,000 × 24) = 36,225,000
36 months = 225,000 + (1,500,000 × 36) = 54,225,000
```

At 10x, 100x, and 1000x the current `events` volume, the table would contain 450,000,000, 4,500,000,000, and 45,000,000,000 rows respectively. At 10,000,000 new rows per day, those volumes represent roughly 45, 450, and 4,500 days of accumulated event data. A single unpartitioned heap cannot keep scanning an ever-growing history for dashboard requests while also absorbing this write rate.

## Query-by-query break analysis

| Table | File and route | Query that breaks first | Why it becomes slow |
| --- | --- | --- | --- |
| `events` | `routes/events.js`, `GET /events?user_id={id}` | `SELECT * FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100` | The predicate and ordering are not supported by an index in the starter schema. PostgreSQL must examine an increasingly large heap and sort or filter many rows to find the newest 100 events. The risk begins at the current 45M-row scale and becomes severe beyond roughly 50M rows. |
| `events` | `routes/metrics.js`, `GET /metrics/monthly` | `SELECT COUNT(*), event_type FROM events WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY event_type` | There is no `created_at` or `(created_at, event_type)` index. Every dashboard request can scan the entire table even though the business question is limited to the last 30 days. Once the table exceeds roughly 50M rows, this is expected to exceed the 500ms response-time budget under normal concurrent load. |
| `sessions` | `routes/sessions.js`, `GET /sessions/active` | `SELECT * FROM sessions WHERE ended_at IS NULL` | `ended_at` is not indexed. The database must inspect every historical session to find active sessions. Under the documented session-rate assumption, the table passes 10M rows after about 6.7 months, at which point an unindexed active-session scan is likely to exceed 500ms. |
| `feature_usage` | `routes/metrics.js`, `POST /metrics/feature-usage` | `INSERT INTO feature_usage (user_id, feature_name, used_at) VALUES ($1, $2, NOW()) RETURNING *` | This write is sent to the primary database and competes with event ingestion for connections, WAL bandwidth, and disk I/O. At the assumed 1.5M rows per month, the table reaches 18.2M rows in 12 months. The query itself is simple, but the primary becomes the shared bottleneck as write bursts and analytics reads grow. |

These thresholds are operational planning thresholds, not substitute measurements for `EXPLAIN (ANALYZE, BUFFERS)` in production. The assignment defines unacceptable latency as more than 500ms; the implementation therefore addresses the structural causes before the projected volume reaches the corresponding threshold.

## Four specific scalability risks

### Risk 1: User activity reads scan an unindexed, unpartitioned events table

The `GET /events` route in `routes/events.js` executes `SELECT * FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`. At approximately **50M `events` rows**, the lack of a composite `(user_id, created_at DESC)` index forces broad heap inspection and ordering work. At the projected **3.645B rows after 12 months**, the query cannot reliably meet the 500ms target. Range partitioning by `created_at` combined with a per-partition `(user_id, created_at DESC)` index limits both the physical search space and the ordering work.

### Risk 2: The monthly metrics query scans all event history

The `GET /metrics/monthly` route executes `SELECT COUNT(*), event_type FROM events WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY event_type`. At approximately **50M rows**, the missing time predicate index makes a sequential scan likely; after one month of current growth, the 30-day window alone contains about **300M rows**. The query will exceed 500ms well before the 12-month projection. Time-based partitions allow PostgreSQL to prune old partitions, while a `(created_at, event_type)` index on each partition supports the recent-window filter.

### Risk 3: Active-session monitoring performs a full historical scan

The `GET /sessions/active` route executes `SELECT * FROM sessions WHERE ended_at IS NULL`. At approximately **10M session rows**, the missing index on `ended_at` means the query reads historical sessions that cannot be active. This is particularly risky for the real-time monitoring use case because its traffic is read-heavy and latency-sensitive. A partial index such as `CREATE INDEX ... ON sessions (id) WHERE ended_at IS NULL` should be added in the next database migration, alongside a bounded response or pagination strategy.

### Risk 4: A single primary handles all reads and writes

Every route currently uses the same pool created from `DATABASE_URL`. The primary therefore handles event ingestion, feature-usage writes, recent-event reads, active-session reads, and monthly aggregation. At **10M event inserts per day**—about **116 inserts per second on average before bursts, retries, and feature-usage writes**—read queries can contend with write WAL and I/O. The result is a shared failure domain: analytics load can slow ingestion and checkout-like event capture. Routing read-only routes to `REPLICA_DB_URL` removes that read pressure from the primary, while writes remain strongly consistent on `PRIMARY_DB_URL`.

## Risk priority

The most urgent risk is the `events` table because it grows by 300M rows every month and is used by both the recent-activity endpoint and monthly analytics. The implementation should therefore introduce date-based partitioning and supporting indexes before the table reaches the first projected 500ms threshold. Archiving then keeps the hot working set bounded, and read-replica routing isolates read-heavy dashboard traffic from ingestion. Those strategies are documented together in `SCALE-PLAN.md`.

## References

[1]: https://www.postgresql.org/docs/current/ddl-partitioning.html "PostgreSQL Documentation: Table Partitioning"
[2]: https://www.postgresql.org/docs/current/indexes-partial.html "PostgreSQL Documentation: Partial Indexes"
[3]: https://www.postgresql.org/docs/current/runtime-config-replication.html "PostgreSQL Documentation: Replication"
