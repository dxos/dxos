//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * Store migrations, keyed `<id>_<name>` as `@effect/sql`'s `Migrator.fromRecord` expects.
 * Ids only ever increase and applied migrations are never edited (nothing verifies their contents).
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/**
 * Own history table, since several stores may share one physical database.
 */
export const MIGRATIONS_TABLE = 'echo_sqlite_migrations';
