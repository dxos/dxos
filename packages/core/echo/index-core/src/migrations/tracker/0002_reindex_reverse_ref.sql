--
-- Forces a reverse-reference reindex. The extractor previously skipped every non-`echo:`
-- reference, so `dxn:` targets (named entities) are absent from databases written by earlier
-- releases; dropping the cursors makes the next pass re-scan every document.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'reverseRef';
