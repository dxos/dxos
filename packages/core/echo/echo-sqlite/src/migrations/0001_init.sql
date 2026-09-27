-- One row per entity (object, relation or persisted type). `body` is the entity's ECHO JSON
-- (`Obj.toJSON` plus `@parent`, `@meta` included) and is the source of truth; every other column is
-- denormalized from it so compiled queries can select, join and order without reading bodies.
CREATE TABLE IF NOT EXISTS echo_entities (
  -- Explicit rowid alias: `echo_fts` rows are keyed by it, and an implicit rowid may be renumbered by VACUUM.
  seq INTEGER PRIMARY KEY,
  space_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  type_dxn TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT,
  source_id TEXT,
  target_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  body TEXT NOT NULL,
  UNIQUE (space_id, id)
);

CREATE INDEX IF NOT EXISTS echo_entities_type ON echo_entities (space_id, type_dxn, id);
CREATE INDEX IF NOT EXISTS echo_entities_kind ON echo_entities (space_id, kind);
CREATE INDEX IF NOT EXISTS echo_entities_parent ON echo_entities (space_id, parent_id);
CREATE INDEX IF NOT EXISTS echo_entities_source ON echo_entities (space_id, source_id);
CREATE INDEX IF NOT EXISTS echo_entities_target ON echo_entities (space_id, target_id);
CREATE INDEX IF NOT EXISTS echo_entities_created ON echo_entities (space_id, created_at);
CREATE INDEX IF NOT EXISTS echo_entities_updated ON echo_entities (space_id, updated_at);

-- Outgoing references, one row per (referrer, property path, target). `prop_path` is the dotted path
-- with array indexes removed, which is how the query AST names a reference property.
CREATE TABLE IF NOT EXISTS echo_refs (
  space_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  prop_path TEXT NOT NULL,
  target_id TEXT NOT NULL,
  PRIMARY KEY (space_id, source_id, prop_path, target_id)
);

CREATE INDEX IF NOT EXISTS echo_refs_target ON echo_refs (space_id, target_id, prop_path);

-- Extracted string values for text search; the rowid is the entity row's `seq`.
CREATE VIRTUAL TABLE IF NOT EXISTS echo_fts USING fts5(text, tokenize = 'trigram');
