//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

// The scripts are read from disk rather than imported with `?raw`: this package runs on Bun and
// Node directly, with no bundler to inline them.
const script = (name: string): string => readFileSync(fileURLToPath(new URL(`./${name}.sql`, import.meta.url)), 'utf8');

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(script('0001_init')),
};

/** Own history table, so a future store sharing the database keeps its own history. */
export const MIGRATIONS_TABLE = 'code_index_migrations';
