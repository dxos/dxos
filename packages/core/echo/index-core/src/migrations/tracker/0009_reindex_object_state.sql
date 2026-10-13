--
-- Re-present every automerge document to the snapshot store so it fills the `heads` column (see
-- `migrations/object-snapshot/0002_object_state.sql`) and keeps each document object's `@meta`, which
-- a client reads from the snapshot. Feed rows already carried both, so their cursors stay.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge';
