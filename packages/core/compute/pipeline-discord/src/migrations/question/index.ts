//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * Migrations for this store, keyed `<id>_<name>` as `Migrator.fromRecord` expects. Ids must only
 * ever increase, and an applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/** Own history table per store — the three discord stores are constructed independently. */
export const MIGRATIONS_TABLE = 'question_migrations';
