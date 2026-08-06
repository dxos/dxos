--
-- Automerge chunk storage. Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `automerge_chunks_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS automerge_chunks (
  key TEXT PRIMARY KEY,
  data BLOB NOT NULL
);
