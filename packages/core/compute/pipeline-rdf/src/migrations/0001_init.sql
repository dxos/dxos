--
-- The RDF pipeline's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op.
--
-- `IF NOT EXISTS` on every CREATE is required, for exactly that reason: this migration runs against
-- databases that already hold these tables. Later migrations are `ALTER`s and deliberately not
-- idempotent — `rdf_migrations` guarantees they run exactly once.
--
-- Immutable: recorded in `rdf_migrations` and never re-run. Change the schema by adding the next
-- numbered migration and listing it in `index.ts`.
--
CREATE TABLE IF NOT EXISTS triples (
  s TEXT NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL,
  oType TEXT NOT NULL, g TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS triples_unique ON triples (s, p, o, oType, g);

CREATE INDEX IF NOT EXISTS triples_spo ON triples (s, p, o);

CREATE INDEX IF NOT EXISTS triples_pos ON triples (p, o);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]', ref TEXT
);

CREATE TABLE IF NOT EXISTS cursors (source TEXT PRIMARY KEY, hash TEXT NOT NULL);
