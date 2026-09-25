-- One row per entity (objects, relations and persisted types) in the space.
-- `data` is the entity's ECHO JSON (`Obj.toJSON`), the single source of truth; the other columns are
-- denormalized from it so the store can be read without decoding every row.
CREATE TABLE IF NOT EXISTS echo_objects (
  space_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  typename TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (space_id, id)
);

CREATE INDEX IF NOT EXISTS echo_objects_typename ON echo_objects (space_id, typename);
