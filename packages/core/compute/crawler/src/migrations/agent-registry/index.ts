//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * Migrations for this store, keyed `<id>_<name>` as `Migrator.fromRecord` expects.
 *
 * Listed explicitly rather than globbed so ids and ordering are reviewable in a diff. Ids must only
 * ever increase, and an applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/** Own history table: the two crawler stores are constructed independently over one database. */
export const MIGRATIONS_TABLE = 'agent_registry_migrations';
