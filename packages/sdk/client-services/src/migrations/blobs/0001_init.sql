--
-- Device-local, content-addressed blob bytes, kept outside Automerge so large blobs do not bloat
-- documents. `uploaded_at` is NULL while the hosted store does not yet hold the bytes; the partial
-- index makes that upload ledger cheap to scan.
--
-- Immutable: recorded in `blobs_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,
  type TEXT,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  uploaded_at INTEGER
);

CREATE INDEX IF NOT EXISTS blobs_pending ON blobs (created_at) WHERE uploaded_at IS NULL;
