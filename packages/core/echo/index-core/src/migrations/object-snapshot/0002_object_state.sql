--
-- The object as its document holds it, beside the JSON snapshot: `state` is the raw entity structure
-- (encoded by `encodeEntityStructure`, so bytes and raw strings survive), `bytes` the document's
-- Automerge bytes, and `heads` the document heads both were read at. A client backs a live object
-- with them and loads `bytes` when it first writes. Null for feed rows, branch documents, and
-- objects too large to ship; `bytes` is also null for a document holding more than this object.
--
-- Filled by the reindex `migrations/tracker/0009_reindex_object_state.sql` schedules.
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
ALTER TABLE objectSnapshot ADD COLUMN heads TEXT;
ALTER TABLE objectSnapshot ADD COLUMN state TEXT;
ALTER TABLE objectSnapshot ADD COLUMN bytes BLOB;
