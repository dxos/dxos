--
-- Documents this host never loads: one whose stored bytes ran Automerge out of memory, or one a space directory retired.
-- Rows are never removed by the host, so a document that broke one start cannot break the next.
--
-- Immutable: recorded in `automerge_quarantine_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS automerge_quarantine (
  document_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  error TEXT,
  quarantined_at INTEGER NOT NULL,
  -- For a retired document: the space whose directory retired it and the url of its replacement.
  space_id TEXT,
  replaced_by TEXT
);
