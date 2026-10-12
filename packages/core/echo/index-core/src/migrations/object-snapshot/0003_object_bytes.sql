--
-- The document's Automerge bytes beside `state` (`0002_object_state.sql`), read at the same `heads`:
-- a client keeps them unloaded and loads them when it first writes to the object. Null for feed rows,
-- branch documents, objects too large to ship, and a document holding more than this object.
--
-- Filled by the reindex `migrations/tracker/0010_reindex_object_bytes.sql` schedules.
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
ALTER TABLE objectSnapshot ADD COLUMN bytes BLOB;
