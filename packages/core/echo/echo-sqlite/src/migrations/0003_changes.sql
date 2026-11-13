--
-- The changes of objects' Automerge documents, one row each, recorded when the indexer reads a
-- document, so `Filter.changes` is a statement over this table rather than a replay of documents.
--
-- Immutable: recorded in `echo_sqlite_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS echo_sqlite_changes (
  spaceId TEXT NOT NULL,
  objectId TEXT NOT NULL,
  hash TEXT NOT NULL,
  actor TEXT NOT NULL,
  seq INTEGER NOT NULL,
  time INTEGER NOT NULL,
  ops INTEGER NOT NULL,
  PRIMARY KEY (spaceId, objectId, hash)
);

CREATE INDEX IF NOT EXISTS echo_sqlite_changes_time ON echo_sqlite_changes (spaceId, time);
