//
// Copyright 2026 DXOS.org
//

import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

import init from './0001_init.sql?raw';

/**
 * Migrations for the trajectory checkpoint cache, keyed `<id>_<name>` as `Migrator.fromRecord` expects.
 *
 * Ids must only ever increase, and an applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

export const MIGRATIONS_TABLE = 'trajectory_cache_migrations';
