--
-- Splits the object snapshot store out of the full-text index.
--
-- `ftsIndex` was both at once: the trigram index AND the row store the query executor joined
-- against and hydrated results from. That coupling made the index impossible to defer — delaying
-- it delayed the rows local queries read — so every keystroke re-tokenized the whole object.
-- FTS5 has no partial update, and a trigram tokenizer emits one token per 3-character window, so
-- a 115KB document cost ~700KB of page writes and ~300ms of worker CPU per save.
--
-- `objectSnapshot` is now that row store: an ordinary table, updated in place and always current.
-- `ftsIndex` keeps its own copy of the text and is re-tokenized from the queue below, off the
-- write path. Rebuilding it as `content=''` would drop the duplicate copy, but only at the cost of
-- re-tokenizing every existing row during this migration.
--
CREATE TABLE IF NOT EXISTS objectSnapshot (
  recordId INTEGER PRIMARY KEY,
  snapshot TEXT NOT NULL
);

-- Seed from what the index already holds, so no object has to be re-read from its document.
INSERT OR REPLACE INTO objectSnapshot (recordId, snapshot) SELECT rowid, snapshot FROM ftsIndex;

-- Record ids whose `ftsIndex` entry is behind `objectSnapshot`. Durable, so a reload mid-burst
-- resumes rather than leaving the index permanently stale.
CREATE TABLE IF NOT EXISTS ftsIndexQueue (
  recordId INTEGER PRIMARY KEY
);
