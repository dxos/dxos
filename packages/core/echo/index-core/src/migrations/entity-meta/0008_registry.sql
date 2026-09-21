--
-- Registry provenance for an indexed object.
--
-- `registryKey` is the canonical entry key the object was registered under — a versioned DXN
-- (`dxn:<nsid>:<version>`) when the entity carries a version, the bare DXN or its EID otherwise.
-- It is both the mark (`registryKey != ''` identifies a registry row, which every space-scoped
-- scan excludes) and the row identity (a re-registration under the same key replaces the row,
-- while a different version is a different key and so a separate row).
--
-- `contentHash` is a digest of the registered snapshot, so a re-push of an unchanged entity is
-- recognised and skipped without rewriting the row or the dependent indexes.
--
-- Unconditional ALTERs: neither column has ever shipped, so no database in the field holds them.
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
ALTER TABLE objectMeta ADD COLUMN registryKey TEXT NOT NULL DEFAULT '';

ALTER TABLE objectMeta ADD COLUMN contentHash TEXT;

CREATE INDEX IF NOT EXISTS idx_object_index_registryKey ON objectMeta(registryKey);
