//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

export const MIGRATIONS_TABLE = 'activity_migrations';
