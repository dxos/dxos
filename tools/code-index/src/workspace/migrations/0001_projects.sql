-- Workspace persistence for the `serve`/`chat` surface: a project is an append-only log of
-- immutable events, and nothing else is stored. Chat history and UI state are both folds over
-- this table, so there is no second place for them to disagree.
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created INTEGER NOT NULL
);

-- `seq` is per-project and dense from 1; the primary key is what makes an append a conflict
-- rather than a silent overwrite when two writers race.
CREATE TABLE IF NOT EXISTS events (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (project_id, seq)
);

CREATE INDEX IF NOT EXISTS events_type ON events (project_id, type);

-- The sandbox's persistent key/value store, scoped per project. Deliberately not an event: this is
-- the agent's scratch memory, and replaying a log must not resurrect a value it later overwrote.
CREATE TABLE IF NOT EXISTS storage (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (project_id, key)
);
