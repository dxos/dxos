--
-- The message store's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op —
-- `IF NOT EXISTS` on every CREATE is what makes that true.
--
-- Immutable: recorded in `message_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS message (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_label TEXT,
  text TEXT NOT NULL,
  created_at TEXT,
  parent_id TEXT,
  raw TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS message_target ON message (target_id, id);
