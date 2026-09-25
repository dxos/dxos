--
-- Index cursor bookkeeping. For automerge: the last-indexed heads of the document. For queues: the
-- position of the item that was indexed last. `cursor` is deliberately typeless — SQLite permits
-- it, and the column stores heterogeneous cursor encodings.
--
-- `IF NOT EXISTS` is required: databases created by earlier releases already hold this table. The
-- DELETEs clean up rows written under index names that no longer exist; deleting absent rows is a
-- no-op, so they are safe on every vintage.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS indexCursor (
  indexName TEXT NOT NULL,
  spaceId TEXT NOT NULL DEFAULT '',
  sourceName TEXT NOT NULL,
  resourceId TEXT NOT NULL DEFAULT '',
  cursor,
  PRIMARY KEY (indexName, spaceId, sourceName, resourceId)
);

DELETE FROM indexCursor WHERE indexName = 'fts';
