--
-- Indexes for `objectMeta`. A separate migration because on databases from earlier releases the
-- table predates the `parent` / `createdAt` / `updatedAt` columns — 0002 adds whichever are
-- missing, and only then can these be created. On a fresh database 0001 already made the full
-- table and 0002 was a no-op.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
CREATE INDEX IF NOT EXISTS idx_object_index_objectId ON objectMeta(spaceId, objectId);

CREATE INDEX IF NOT EXISTS idx_object_index_typeDXN ON objectMeta(spaceId, typeDXN);

CREATE INDEX IF NOT EXISTS idx_object_index_version ON objectMeta(version);

CREATE INDEX IF NOT EXISTS idx_object_index_parent ON objectMeta(spaceId, parent);

CREATE INDEX IF NOT EXISTS idx_object_index_updatedAt ON objectMeta(updatedAt);

CREATE INDEX IF NOT EXISTS idx_object_index_createdAt ON objectMeta(createdAt);
