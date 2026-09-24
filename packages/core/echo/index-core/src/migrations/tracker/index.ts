//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import reindexReverseRef from './0002_reindex_reverse_ref.sql?raw';
import retirePreConvergenceKeyCursors from './0003_retire_pre_convergence_key_cursors.sql?raw';
import retireFtsCursor from './0004_retire_fts_cursor.sql?raw';
import rebuildFtsText from './0005_rebuild_fts_text.sql?raw';
import retireReverseRef2Cursors from './0006_retire_reverse_ref2_cursors.sql?raw';
import reindexObjectSnapshot from './0007_reindex_object_snapshot.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_reindex_reverse_ref': SqlMigrations.apply(reindexReverseRef),
  '0003_retire_pre_convergence_key_cursors': SqlMigrations.apply(retirePreConvergenceKeyCursors),
  '0004_retire_fts_cursor': SqlMigrations.apply(retireFtsCursor),
  '0005_rebuild_fts_text': SqlMigrations.apply(rebuildFtsText),
  '0006_retire_reverse_ref2_cursors': SqlMigrations.apply(retireReverseRef2Cursors),
  '0007_reindex_object_snapshot': SqlMigrations.apply(reindexObjectSnapshot),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'index_cursor_migrations';
