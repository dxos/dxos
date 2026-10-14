//
// Copyright 2026 DXOS.org
//

import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

import init from './0001_init.sql?raw';
import objectState from './0002_object_state.sql?raw';
import objectBytes from './0003_object_bytes.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_object_state': SqlMigrations.apply(objectState),
  '0003_object_bytes': SqlMigrations.apply(objectBytes),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'object_snapshot_migrations';
