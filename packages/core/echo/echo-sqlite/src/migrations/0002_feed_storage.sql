--
-- Objects are Automerge documents in the feed store and their rows are written by the indexer, so the
-- entity, reference and text tables of 0001 are no longer read or written.
--
-- Runs after the feed store's and the indexer's migrations, which create `objectMeta`.
--
-- Immutable: recorded in `echo_sqlite_migrations` and never re-run.
--
DROP TABLE IF EXISTS echo_fts;
DROP TABLE IF EXISTS echo_refs;
DROP TABLE IF EXISTS echo_entities;

-- The actor this database file writes blocks as: unique per file, so two devices never claim one block slot.
CREATE TABLE IF NOT EXISTS echo_sqlite_device (
  id INTEGER PRIMARY KEY CHECK (id = 0),
  actorId TEXT NOT NULL
);

-- A typed select walks this index, which also yields id order for paging.
CREATE INDEX IF NOT EXISTS echo_sqlite_object_type ON objectMeta (spaceId, typeDXN, objectId);
