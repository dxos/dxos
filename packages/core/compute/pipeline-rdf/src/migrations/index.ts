//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * RDF pipeline migrations, keyed `<id>_<name>` as `Migrator.fromRecord` expects.
 *
 * Listed explicitly rather than globbed so ids and ordering are reviewable in a diff, and so a
 * bundler cannot change what ships. Ids must only ever increase: the migrator applies everything
 * above the highest recorded id, so an id at or below one that has shipped is skipped for good. An
 * applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/**
 * Own history table per store, since several packages can share one physical database.
 */
export const MIGRATIONS_TABLE = 'rdf_migrations';
