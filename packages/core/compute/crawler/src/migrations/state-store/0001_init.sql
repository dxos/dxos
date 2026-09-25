--
-- The crawl state store's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op.
--
-- `IF NOT EXISTS` on every CREATE is required, for exactly that reason. The seed row uses
-- `ON CONFLICT DO NOTHING` for the same reason. Later migrations are `ALTER`s and deliberately not
-- idempotent — `state_store_migrations` guarantees they run once.
--
-- `crawl_run` is a singleton by construction: `CHECK (id = 1)` cannot be expressed in a schema DSL,
-- which is one reason this DDL is hand-written.
--
-- Immutable: recorded in `state_store_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS crawl_target (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  thread_id TEXT,
  parent_message_id TEXT,
  depth INTEGER NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL,
  cursor TEXT,
  last_run_at TEXT,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS crawl_target_position ON crawl_target (position);

CREATE TABLE IF NOT EXISTS crawl_run (id INTEGER PRIMARY KEY CHECK (id = 1), status TEXT NOT NULL);

INSERT INTO crawl_run (id, status) VALUES (1, 'idle') ON CONFLICT(id) DO NOTHING;
