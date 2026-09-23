--
-- Retire the cursor name the full-text index tracked the data source under. That leg is now the
-- object snapshot store (`objectSnapshot`), and the full-text index is a second step sourced from
-- the index itself rather than from automerge or a feed, so it keeps a cursor over
-- `objectMeta.version` instead. Dropping the name re-presents every document, which is what fills
-- the new store; deleting absent rows is a no-op, so this is safe on every vintage.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'fts6';
