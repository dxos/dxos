--
-- The keyring's initial schema. Equivalent to the DDL this store created inline before migrations existed, so a database
-- from an earlier release applies it as a no-op — `IF NOT EXISTS` is what makes that true.
--
-- Immutable: recorded in `keyring_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS keyring (
  public_key TEXT PRIMARY KEY,
  record BLOB NOT NULL
);
