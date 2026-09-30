//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'convergence_key_intent_migrations';
