--
-- Record ids whose `objectSnapshot` row has moved on since the index last saw it.
--
-- The index is derived from the snapshot store rather than from the data source, so this is its
-- cursor: durable, so a reload mid-burst resumes rather than leaving the index permanently stale,
-- and a set rather than a log, so a burst of edits to one object costs one re-tokenization.
--
-- Empty on upgrade, which is correct: every row the index already holds was written synchronously
-- by the release that preceded the split.
--
-- Immutable: recorded in `fts_index_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS ftsIndexDirty (
  recordId INTEGER PRIMARY KEY
);
