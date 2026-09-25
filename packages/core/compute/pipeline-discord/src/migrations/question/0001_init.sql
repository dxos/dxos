--
-- The question store's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op —
-- `IF NOT EXISTS` on every CREATE is what makes that true.
--
-- Immutable: recorded in `question_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS question (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  status TEXT NOT NULL,
  answer TEXT,
  supporting_ids TEXT NOT NULL DEFAULT '[]',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
