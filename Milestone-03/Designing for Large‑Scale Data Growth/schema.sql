-- TrackFlow scalable PostgreSQL schema
-- The events table is partitioned by month so recent time-bounded queries can
-- prune historical partitions. The default partition prevents inserts from
-- failing between scheduled partition-creation jobs.

-- Core users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table to track user activity periods
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER
);

-- The active-session query is read-heavy and only needs rows without an end.
CREATE INDEX sessions_active_idx ON sessions (id) WHERE ended_at IS NULL;
CREATE INDEX sessions_user_started_idx ON sessions (user_id, started_at DESC);

-- Main events table for all user interactions.
-- A partitioned-table primary key must include the partition key. The id
-- sequence remains globally unique, while (id, created_at) is the legal key.
CREATE TABLE events (
    id BIGSERIAL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_id BIGINT REFERENCES sessions(id),
    event_type VARCHAR(50) NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Three monthly partitions are kept explicit for the initial rollout.
-- The default partition is a safety net until the next monthly partition is
-- created and also makes local testing with arbitrary timestamps reliable.
CREATE TABLE events_2026_08 PARTITION OF events
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE events_2026_09 PARTITION OF events
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE events_2026_10 PARTITION OF events
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE events_default PARTITION OF events DEFAULT;

-- These parent indexes create matching indexes on every existing and future
-- partition. They support the two dominant event read patterns.
CREATE INDEX events_user_created_at_idx
    ON events (user_id, created_at DESC);

CREATE INDEX events_created_at_event_type_idx
    ON events (created_at, event_type);

-- Feature usage tracking for internal analytics
CREATE TABLE feature_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    feature_name VARCHAR(100) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX feature_usage_user_used_at_idx
    ON feature_usage (user_id, used_at DESC);

-- Cold event data remains queryable for compliance without burdening the hot
-- partitions. The nightly move itself is defined in archive-events.sql.
CREATE TABLE events_archive (
    id BIGINT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_id BIGINT REFERENCES sessions(id),
    event_type VARCHAR(50) NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

CREATE INDEX events_archive_user_created_at_idx
    ON events_archive (user_id, created_at DESC);
CREATE INDEX events_archive_created_at_idx
    ON events_archive (created_at);
