//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import { addPropPathNormalized } from './0002_prop_path_normalized.ts';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_prop_path_normalized': addPropPathNormalized,
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'reverse_ref_migrations';
