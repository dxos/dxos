--
-- Registry provenance and normalized registry identity for an indexed object.
--
-- `origin` says which data source the row came from — 'automerge', 'feed' or 'registry'. It is
-- the authoritative mark: every space- or queue-scoped scan admits only `origin != 'registry'`,
-- since registry entities belong to no space.
--
-- `name` and `version` are the registry identity, extracted from the entity's own metadata rather
-- than composed into one string: `name` is the entity's meta key (a typename for a type entity,
-- its EID when it carries no key) and `version` its meta version. Together they are the row
-- identity, so a re-registration under the same pair replaces the row while a different version
-- is a separate row — and an unversioned lookup is `name = ?` rather than a LIKE prefix.
--
-- `contentHash` is a digest of the registered snapshot, so a re-push of an unchanged entity is
-- recognised and skipped without rewriting the row or the dependent indexes.
--
-- The incumbent `version` column is the monotonic counter the primary pass stamps on every write,
-- which secondary indexes track as their cursor. It is renamed to `seq` — what it has always been
-- — so `version` can carry the registry version it is named for. SQLite rewrites the dependent
-- index definition as part of RENAME COLUMN, so `idx_object_index_version` silently becomes an
-- index on `seq`; it is dropped and recreated under the right name rather than left misnamed.
--
-- Unconditional ALTERs: none of these columns has ever shipped, so no database in the field holds
-- them.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
ALTER TABLE objectMeta RENAME COLUMN version TO seq;

DROP INDEX IF EXISTS idx_object_index_version;

CREATE INDEX IF NOT EXISTS idx_object_index_seq ON objectMeta(seq);

ALTER TABLE objectMeta ADD COLUMN name TEXT NOT NULL DEFAULT '';

ALTER TABLE objectMeta ADD COLUMN version TEXT NOT NULL DEFAULT '';

ALTER TABLE objectMeta ADD COLUMN origin TEXT NOT NULL DEFAULT 'automerge';

ALTER TABLE objectMeta ADD COLUMN contentHash TEXT;

CREATE INDEX IF NOT EXISTS idx_object_index_origin ON objectMeta(origin);

CREATE INDEX IF NOT EXISTS idx_object_index_name_version ON objectMeta(name, version);
