--
-- Each space directory's JSON at the heads it was read at, so a client is served the directory without the host
-- reading it out of Automerge while its stored heads are unchanged.
--
-- Immutable: recorded in `space_state_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS echo_directory_snapshots (
  document_id TEXT PRIMARY KEY,
  heads TEXT NOT NULL,
  json TEXT NOT NULL
);
