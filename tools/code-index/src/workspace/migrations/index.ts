//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as SqlMigrations from '@dxos/sql-sqlite/SqlMigrations';

// Read from disk rather than imported with `?raw`: this package runs on Bun and Node directly,
// with no bundler to inline them.
const script = (name: string): string => readFileSync(fileURLToPath(new URL(`./${name}.sql`, import.meta.url)), 'utf8');

export const MIGRATIONS = {
  '0001_projects': SqlMigrations.apply(script('0001_projects')),
};

/** The workspace log keeps its own history, separate from the code index's. */
export const MIGRATIONS_TABLE = 'code_index_workspace_migrations';
