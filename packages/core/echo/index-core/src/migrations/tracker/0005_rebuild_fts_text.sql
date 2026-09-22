--
-- Forces a full-text reindex. The index now holds extracted text instead of the object's JSON
-- (see `migrations/fts/0002_text_content.sql`), and its table was dropped to change shape, so
-- every row has to be re-tokenized; dropping the cursor makes the next pass re-present them.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'fts7';
