--
-- Space root-document bookkeeping. Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `space_state_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS echo_spaces (
  space_id TEXT PRIMARY KEY,
  root_doc_url TEXT NOT NULL
);
