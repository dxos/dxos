--
-- Space metadata (small keyed blobs plus a per-space large record). Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `metadata_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS space_metadata (
  key TEXT PRIMARY KEY,
  value BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS space_large (
  space_key TEXT PRIMARY KEY,
  value BLOB NOT NULL
);
