//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import textContent from './0002_text_content.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_text_content': SqlMigrations.apply(textContent),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'fts_index_migrations';
