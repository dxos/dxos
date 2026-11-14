--
-- Coordination of several connections (processes) on one file (F-8).
--
-- `echo_sqlite_change_log`: the objects each commit wrote, so a connection that sees
-- `PRAGMA data_version` move learns which of its resident objects and queries are stale.
-- `echo_sqlite_sync_leases`: which connection syncs a space with its authority.
--
-- Immutable: recorded in `echo_sqlite_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS echo_sqlite_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spaceId TEXT NOT NULL,
  objectId TEXT NOT NULL,
  writer TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS echo_sqlite_change_log_space ON echo_sqlite_change_log (spaceId, id);

-- Every commit deletes the rows past retention, by age.
CREATE INDEX IF NOT EXISTS echo_sqlite_change_log_at ON echo_sqlite_change_log (at);

CREATE TABLE IF NOT EXISTS echo_sqlite_sync_leases (
  spaceId TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  renewedAt INTEGER NOT NULL
);
