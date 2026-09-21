--
-- Object snapshot store: the JSON of every indexed object, keyed by its `objectMeta` record id.
--
-- This was the content of the `ftsIndex` virtual table until the trigram index became the dominant
-- cost of editing. FTS5 cannot update a row in place and a trigram tokenizer emits one token per
-- 3-character window, so a 115KB document cost ~700KB of page writes and ~300ms of worker CPU per
-- save — and because the same table was also the row store every query hydrated from, the index
-- could not be allowed to lag. Splitting them is what makes the expensive half deferrable.
--
-- Seeded from the index so no object has to be re-read from its document; `ftsIndex` is created by
-- the `fts` store, which `IndexEngine.migrate` runs first for exactly this reason.
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS objectSnapshot (
  recordId INTEGER PRIMARY KEY,
  snapshot TEXT NOT NULL
);

INSERT OR REPLACE INTO objectSnapshot (recordId, snapshot) SELECT rowid, snapshot FROM ftsIndex;
