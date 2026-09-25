--
-- The global position a feed block was assigned, denormalized out of the indexed snapshot so a
-- cursor read (`queuePosition > ?` ordered and limited) is an index seek rather than a full feed
-- scan. Null for automerge objects and for local blocks not yet positioned.
--
-- Unconditional ALTER, unlike the columns 0002 probes for: this column has never shipped, so no
-- database in the field can already hold it.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
ALTER TABLE objectMeta ADD COLUMN queuePosition INTEGER;

CREATE INDEX IF NOT EXISTS idx_object_index_queuePosition ON objectMeta(queueId, queuePosition);
