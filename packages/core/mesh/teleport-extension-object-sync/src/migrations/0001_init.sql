--
-- The blob store's initial schema. Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `blob_store_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS blobs_meta (
  id TEXT PRIMARY KEY,
  meta BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS blobs_data (
  id TEXT PRIMARY KEY,
  data BLOB NOT NULL
);
