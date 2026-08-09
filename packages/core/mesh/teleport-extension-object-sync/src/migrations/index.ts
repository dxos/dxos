//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * Blob store migrations, keyed `<id>_<name>` as `Migrator.fromRecord` expects. Ids must only ever increase,
 * and an applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'blob_store_migrations';
