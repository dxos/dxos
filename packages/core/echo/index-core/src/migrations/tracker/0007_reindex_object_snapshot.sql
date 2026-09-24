--
-- Re-present every document to the object snapshot store, so rows written before it kept document
-- heads and stored fields (`object-snapshot/0002_document_copy.sql`) gain them. Rows stay readable
-- while the store refills, since each is replaced in place.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot';
