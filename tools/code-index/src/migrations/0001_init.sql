-- The ledger of indexed files. One row per file; `graph` names the RDF graph holding its current
-- revision and `pending_graph` a revision whose write did not finish (dropped on the next open).
CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  graph TEXT NOT NULL,
  pending_graph TEXT
);

CREATE INDEX IF NOT EXISTS files_language ON files (language);

CREATE INDEX IF NOT EXISTS files_pending ON files (pending_graph);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
