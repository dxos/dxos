--
-- Re-presents every feed block to the object snapshot store. Snapshots now carry the id of the
-- block they were read from, which is how a reader recognises a block it already applied; snapshots
-- written by earlier releases lack it, and most never got a position either (a block positioned
-- after it was indexed is not re-presented), so a reader could not tell them apart from new
-- content. Only the queue source's cursors are dropped: automerge documents are unaffected.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'queue';
