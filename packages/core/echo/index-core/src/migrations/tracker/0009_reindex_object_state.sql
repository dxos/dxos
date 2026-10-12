--
-- Re-present every automerge document to the snapshot store so it fills the `heads` and `state`
-- columns (see `migrations/object-snapshot/0002_object_state.sql`). Feed rows carry no state, so
-- their cursors stay.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge';
