//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import indexes from './0003_indexes.sql?raw';
import queuePosition from './0004_queue_position.sql?raw';

/**
 * Columns added to `objectMeta` after it first shipped, with the DDL that adds them. Databases in
 * the field hold any prefix of this history — some have none of these, some a few, fresh ones all —
 * so 0002 probes the live table and adds exactly what is missing. Plain `.sql` cannot express that:
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, and an unconditional ALTER fails with "duplicate
 * column" on any database that already has the column (including every fresh one, where 0001 just
 * created it).
 */
const LATER_COLUMNS: ReadonlyArray<readonly [name: string, ddl: string]> = [
  ['parent', 'parent TEXT'],
  ['createdAt', 'createdAt INTEGER'],
  ['updatedAt', 'updatedAt INTEGER'],
  ['queueNamespace', "queueNamespace TEXT NOT NULL DEFAULT ''"],
];

const addMissingColumns = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
  const present = new Set(columns.map((column) => column.name));
  for (const [name, ddl] of LATER_COLUMNS) {
    if (!present.has(name)) {
      yield* sql.unsafe(`ALTER TABLE objectMeta ADD COLUMN ${ddl}`);
    }
  }
});

/**
 * Entity-meta migrations, keyed `<id>_<name>` as `Migrator.fromRecord` expects.
 *
 * Order is load-bearing: 0003's indexes reference columns that 0002 guarantees. Ids must only ever
 * increase, and an applied migration must never be edited — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_missing_columns': addMissingColumns,
  '0003_indexes': SqlMigrations.apply(indexes),
  '0004_queue_position': SqlMigrations.apply(queuePosition),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'entity_meta_migrations';
