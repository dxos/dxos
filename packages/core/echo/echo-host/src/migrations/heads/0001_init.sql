--
-- Last-known heads per automerge document. Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `automerge_heads_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS automerge_heads (
  document_id TEXT PRIMARY KEY,
  heads BLOB NOT NULL
);
