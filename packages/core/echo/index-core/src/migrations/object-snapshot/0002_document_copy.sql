--
-- What a reader needs beside an object's JSON to rebuild its Automerge document without loading it:
-- the document's heads when the indexer read the object, and the document's `access` with the
-- object's stored fields other than `data`, exactly as stored (the JSON form reshapes those).
-- `stored` stays NULL for an object holding a value JSON cannot carry; both stay NULL for feed
-- objects and for rows written before this, which readers treat as "load the document".
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
ALTER TABLE objectSnapshot ADD COLUMN heads TEXT;
ALTER TABLE objectSnapshot ADD COLUMN stored TEXT;
