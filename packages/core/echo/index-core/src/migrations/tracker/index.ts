//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import reindexReverseRef from './0002_reindex_reverse_ref.sql?raw';
import retirePreConvergenceKeyCursors from './0003_retire_pre_convergence_key_cursors.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_reindex_reverse_ref': SqlMigrations.apply(reindexReverseRef),
  '0003_retire_pre_convergence_key_cursors': SqlMigrations.apply(retirePreConvergenceKeyCursors),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'index_cursor_migrations';
