--
-- Re-presents every object so `objectMeta.annotations` (entity-meta 0010) is filled. Every indexing
-- pass rewrites the object's meta row, and re-indexing is per-object, so without this an annotation
-- set before the upgrade stays invisible to compiled annotation filters until the object next changes.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'objectSnapshot';
