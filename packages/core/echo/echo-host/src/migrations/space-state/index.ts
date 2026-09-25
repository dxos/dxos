//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import spaceRoot from './0002_space_root.sql?raw';

/** An applied migration must never be edited — nothing verifies its contents. */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_space_root': SqlMigrations.apply(spaceRoot),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'space_state_migrations';
