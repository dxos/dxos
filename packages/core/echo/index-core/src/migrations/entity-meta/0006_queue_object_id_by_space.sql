--
-- Re-creates 0005's index space-first, now that a queue read scopes by the space owning the queue:
-- the seek needs `spaceId` leading to use both equalities. `IF NOT EXISTS` cannot alter an existing
-- index, so the old shape is dropped first — a database that applied 0005 would otherwise keep
-- `(queueId, objectId)` and silently fall back to a scan and sort.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
DROP INDEX IF EXISTS idx_object_index_queueObjectId;

CREATE INDEX IF NOT EXISTS idx_object_index_queueObjectId ON objectMeta(spaceId, queueId, objectId);
