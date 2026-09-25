--
-- The desired shape of `objectMeta`, as consumed and produced by `entity-meta-index.ts` — the
-- INSERT writes all 14 non-key columns and `SELECT *` reads them back through the EntityMeta schema.
--
-- `IF NOT EXISTS` is required: databases created by earlier releases already hold this table, in
-- several vintages (see 0002). Indexes live in 0003, which must run after 0002 has guaranteed the
-- columns they reference exist.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS objectMeta (
  recordId INTEGER PRIMARY KEY AUTOINCREMENT,
  objectId TEXT NOT NULL,
  queueId TEXT NOT NULL DEFAULT '',
  queueNamespace TEXT NOT NULL DEFAULT '',
  spaceId TEXT NOT NULL,
  documentId TEXT NOT NULL DEFAULT '',
  entityKind TEXT NOT NULL,
  typeDXN TEXT NOT NULL,
  deleted INTEGER NOT NULL,
  source TEXT,
  target TEXT,
  parent TEXT,
  version INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
);
