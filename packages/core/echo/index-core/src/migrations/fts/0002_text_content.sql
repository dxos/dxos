--
-- Re-create the index over extracted text rather than over the object's JSON.
--
-- The JSON carried every property name into the index, so `title` or `name` matched any object
-- that merely had such a field, and under a trigram tokenizer any 3-character window of a key
-- (`des` of `description`) matched too. The column now holds only the string values the object
-- contains (see `extractIndexableText`), hence the rename from `snapshot` to `text`.
--
-- FTS5 has no `ALTER TABLE`, so the table is dropped and rebuilt; the rows come back on the next
-- pass, which `migrations/tracker/0005_rebuild_fts_text.sql` schedules by retiring the cursor.
--
-- Immutable: recorded in `fts_index_migrations` and never re-run.
--
DROP TABLE IF EXISTS ftsIndex;
CREATE VIRTUAL TABLE ftsIndex USING fts5(text, tokenize = 'trigram');
