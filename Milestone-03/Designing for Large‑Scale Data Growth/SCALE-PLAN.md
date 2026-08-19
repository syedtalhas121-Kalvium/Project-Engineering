# TrackFlow Scale Plan

TrackFlow adds **300,000,000 event rows per month** on the challenge's current growth trajectory. The design below keeps the frequently accessed working set small, makes time-bounded queries prune historical data, and removes read-heavy dashboard traffic from the write primary. PostgreSQL's declarative partitioning is appropriate because it splits one logical table into smaller physical pieces and can improve performance when queries touch only one or a few partitions.[1]

## 1. Growth Projections

The input values are 50,000 active users, 200 events per user per day, 10,000,000 new event rows per day, 45,000,000 current event rows, and 300,000,000 projected event rows per month. The event projection is:

```text
rows at month N = 45,000,000 + (300,000,000 × N)
```

| Horizon | `events` rows | First query expected to miss the 500ms target | Primary reason |
| --- | ---: | --- | --- |
| Current | 45,000,000 | `GET /events?user_id={id}`: `SELECT * FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100` | No supporting composite index and no partition pruning. |
| 12 months | 3,645,000,000 | `GET /metrics/monthly`: 30-day `COUNT(*) ... GROUP BY event_type` | The last-30-day aggregation scans a very large unpartitioned history. |
| 24 months | 7,245,000,000 | Both event reads and metrics | Concurrent dashboard reads compete with 10M daily inserts on one primary. |
| 36 months | 10,845,000,000 | All event-table reads | A single flat heap and one database cannot sustain the working set and write rate. |

The three largest tables are projected as follows. The repository does not state current rates for `sessions` or `feature_usage`, so the companion analysis uses a clearly identified planning assumption of one row per active user per day for each. The events numbers do not depend on that assumption.

| Table | Current baseline | Monthly growth | 12 months | 24 months | 36 months |
| --- | ---: | ---: | ---: | ---: | ---: |
| `events` | 45,000,000 | 300,000,000 | 3,645,000,000 | 7,245,000,000 | 10,845,000,000 |
| `sessions` | 225,000 | 1,500,000 | 18,225,000 | 36,225,000 | 54,225,000 |
| `feature_usage` | 225,000 | 1,500,000 | 18,225,000 | 36,225,000 | 54,225,000 |

`GROWTH-ANALYSIS.md` records the arithmetic, four route-level risks, and the operational thresholds used for the 500ms definition of unacceptable latency.

## 2. Three-Strategy Summary

### Partitioning: monthly range partitions on `events.created_at`

The schema changes `events` to `PARTITION BY RANGE (created_at)` and creates explicit monthly partitions for August, September, and October 2026 plus a default partition for safe local and transition-period inserts. The partition key is **`created_at`** because every high-volume event query is time-oriented: recent activity is ordered by time, monthly metrics filter to the last 30 days, and archival removes data older than 90 days.

A `user_id` hash key would distribute rows evenly, but it would not make a time-window predicate skip old data. It would also scatter the monthly metrics workload over every hash partition and make the 90-day archive span all partitions. Date range partitioning therefore matches both the access pattern and the lifecycle policy. Monthly partitions are preferred over yearly partitions because each partition remains operationally bounded, monthly analytics can prune to one or two partitions, and an old month can be detached or archived without rewriting a multi-year partition. Daily partitions would make the catalog and maintenance workload unnecessarily large for this API.

The parent indexes are inherited by existing and future partitions:

```sql
CREATE INDEX events_user_created_at_idx
    ON events (user_id, created_at DESC);

CREATE INDEX events_created_at_event_type_idx
    ON events (created_at, event_type);
```

The three common queries benefit in different ways:

| Query | Partition effect | Index effect |
| --- | --- | --- |
| `GET /events?user_id={id}` | A query that adds a time bound can prune to the relevant month or months. | `(user_id, created_at DESC)` returns the newest rows without a large sort. The current route remains correct without a time bound, but a bounded dashboard query is strongly recommended. |
| `GET /metrics/monthly` | Its last-30-day predicate prunes historical monthly partitions; normally only the current and preceding month are relevant. | `(created_at, event_type)` narrows the time range before grouping. |
| Compliance or history query | The hot table contains only recent partitions while cold history is separately queryable. | The archive table has `(user_id, created_at DESC)` and `created_at` indexes for audit lookups. |

PostgreSQL documents that partition pruning is the mechanism that prevents irrelevant partitions from being scanned, and it recommends creating the required partitions ahead of time because inserts outside existing bounds otherwise fail.[1] The default partition in this implementation is a safety net, not a replacement for monthly partition automation.

### Archiving: retain 90 hot days and move cold events nightly

Raw events older than 90 days are cold for the dashboard workload but remain required for compliance. `archive-events.sql` runs at **02:15 UTC every night** against `PRIMARY_DB_URL` and uses a data-modifying CTE to move rows from `events` into `events_archive`. The archive table preserves the event payload, original timestamp, identity keys, and an `archived_at` audit timestamp.

The archive remains queryable. A compliance query whose range crosses the retention boundary uses `UNION ALL` over `events` and `events_archive`, with the same user and timestamp predicates. Since a successful move places a row in exactly one table, `UNION ALL` avoids unnecessary duplicate elimination work. The archive indexes support user-history and timestamp-based investigations.

At the current 10,000,000-row daily rate, a 90-day hot window contains approximately **900,000,000 event rows**. The archive job does not reduce the table during the first 90 days because there is no data older than the threshold. After the first 90 days, the hot table stabilizes near 900M rows while older data moves to the archive. At month 12, approximately 2.745B of the projected 3.645B rows are cold, so roughly **75.3%** of event rows are outside the hot working set. At month 36, approximately 9.945B of 10.845B rows, or **91.7%**, are in the archive.

### Read replicas: route every read-only route away from the primary

`db.js` creates a `primaryPool` from `PRIMARY_DB_URL` and a `replicaPool` from `REPLICA_DB_URL`. If the two URLs are equal, the same pool is reused so local testing and a single-database deployment still work. The route mapping is:

| Route | Operation | Connection |
| --- | --- | --- |
| `POST /events` | `INSERT ... RETURNING *` | Primary |
| `GET /events` | Recent-event `SELECT` | Replica |
| `GET /metrics/monthly` | 30-day aggregation `SELECT` | Replica |
| `POST /metrics/feature-usage` | `INSERT ... RETURNING *` | Primary |
| `POST /sessions/start` | Session `INSERT ... RETURNING *` | Primary |
| `GET /sessions/active` | Active-session `SELECT` | Replica |

The most read-heavy routes are the recent-event dashboard, monthly metrics, and active-session monitor. Routing them to a standby isolates their scans and aggregation work from the primary's ingestion path. PostgreSQL's streaming-replication model distinguishes a primary that sends changes from a standby that receives them, so the application must treat replica results as potentially stale and monitor replication lag.[3]

## 3. Implementation Order

**First, partition and index `events`.** The event table grows by 300M rows per month and is the source of both high-volume read queries. This is the most urgent structural risk. The rollout should create future monthly partitions ahead of time, validate row routing, and compare `EXPLAIN (ANALYZE, BUFFERS)` plans before and after the change.

**Second, enable the 90-day archive job.** Once the partitioned table is accepting new writes, begin nightly moves for data older than 90 days. The first run should be measured and throttled if necessary; after steady state, the hot working set remains bounded and old partitions can be detached or moved to cheaper storage as an operational optimization. PostgreSQL notes that dropping or detaching a partition can be much faster than deleting millions of rows one at a time.[1]

**Third, activate replica routing.** With the query shapes and hot partitions stabilized, provision a streaming standby, verify replay health, and set `REPLICA_DB_URL`. The code is safe to deploy before a separate replica exists because equal URLs reuse one pool. During rollout, monitor error rates, replica lag, read latency, and primary connection utilization.

## 4. Trade-offs and Risks

| Strategy | Trade-off or failure mode | Mitigation |
| --- | --- | --- |
| Partitioning | Monthly DDL and partition-boundary mistakes add operational complexity. A missing future partition can reject inserts; an unbounded query can still touch many partitions. | Create the next 3–6 months ahead of time, retain the default safety partition, alert on default-partition row counts, and test insert routing in CI. Keep time predicates on dashboard queries. |
| Archiving | A nightly move creates a short period of operational load and makes cross-boundary reads more complex. A failed or interrupted job could leave cold data in the hot table or duplicate an archive copy. | Use the idempotent archive primary key, `ON_ERROR_STOP=1`, job metrics, row-count reconciliation, and a documented `UNION ALL` compliance query. Archive only after the 90-day policy is approved. |
| Read replicas | Replication lag can make dashboard reads temporarily stale, and a replica outage can remove the read path. Read-after-write behavior is not guaranteed if a user writes to the primary and immediately reads from a lagging replica. | Monitor lag, set a lag threshold that triggers fallback to primary, route consistency-sensitive reads to primary, and preserve the equal-URL fallback for local operation. |

## Rollout checklist

1. Apply `schema.sql` to a staging database and verify the partition key, primary key, indexes, foreign keys, and default partition.
2. Load representative event data and compare plans for the recent-events and monthly-metrics queries.
3. Create future monthly partitions before the current month closes.
4. Dry-run the archive selection, reconcile counts, then enable the nightly job.
5. Provision the standby and monitor replay lag before setting `REPLICA_DB_URL`.
6. Exercise every API endpoint with both URLs equal, then repeat read routes against the real replica.

## References

[1]: https://www.postgresql.org/docs/current/ddl-partitioning.html "PostgreSQL Documentation: Table Partitioning"
[2]: https://www.postgresql.org/docs/current/indexes-partial.html "PostgreSQL Documentation: Partial Indexes"
[3]: https://www.postgresql.org/docs/current/runtime-config-replication.html "PostgreSQL Documentation: Replication"
