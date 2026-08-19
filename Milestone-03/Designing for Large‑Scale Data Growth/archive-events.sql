-- Run nightly during a low-traffic window, for example at 02:15 UTC:
-- 15 2 * * * psql "$PRIMARY_DB_URL" -v ON_ERROR_STOP=1 -f archive-events.sql
--
-- A data-modifying CTE makes the move atomic from the caller's perspective:
-- rows are returned by DELETE and inserted into the archive in one statement.
-- Re-running is safe if a previous execution is retried after a partial client
-- failure because the archive primary key protects against duplicate copies.

WITH moved_events AS (
    DELETE FROM events
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING id, user_id, session_id, event_type, properties, created_at
)
INSERT INTO events_archive (
    id,
    user_id,
    session_id,
    event_type,
    properties,
    created_at,
    archived_at
)
SELECT
    id,
    user_id,
    session_id,
    event_type,
    properties,
    created_at,
    NOW()
FROM moved_events
ON CONFLICT (id, created_at) DO NOTHING;

-- Compliance queries should search both hot and cold data when the date range
-- crosses the 90-day boundary. The UNION ALL avoids duplicate work because a
-- row is present in only one of the two tables after a successful move.
-- Example:
-- SELECT id, user_id, session_id, event_type, properties, created_at
-- FROM events
-- WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
-- UNION ALL
-- SELECT id, user_id, session_id, event_type, properties, created_at
-- FROM events_archive
-- WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
-- ORDER BY created_at DESC;
