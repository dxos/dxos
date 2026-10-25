--
-- The local insertion id of the feed block a queue row was last written from, so the index can drop
-- exactly the rows whose current block retention deleted: a live feed object re-appends whole under
-- the same id, and a trimmed older block must not take the row its newer block still backs. Null for
-- automerge objects and for rows written before this column existed.
--
-- Unconditional ALTER, as in 0004: this column has never shipped.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
ALTER TABLE objectMeta ADD COLUMN queueInsertionId INTEGER;

CREATE INDEX IF NOT EXISTS idx_object_index_queueInsertionId ON objectMeta(spaceId, queueId, queueInsertionId);
