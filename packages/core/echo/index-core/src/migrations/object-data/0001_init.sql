--
-- The body the query compiler predicates on: the full ObjectJSON of every indexed object (meta
-- included), stored as JSONB so `json_extract` skips the parse. One row per `objectMeta` row,
-- written in the same transaction as the metadata by `ObjectDataIndex.update`.
--
-- `IF NOT EXISTS` is required: a database left partly initialised by a crash may already hold it.
--
-- Immutable: recorded in `object_data_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS objectData (
  recordId INTEGER PRIMARY KEY,
  body BLOB NOT NULL
);
