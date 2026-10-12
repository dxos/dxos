--
-- Re-present every automerge document to the snapshot store so it fills the `bytes` column (see
-- `migrations/object-snapshot/0003_object_bytes.sql`). Feed rows carry no bytes, so their cursors stay.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge';
