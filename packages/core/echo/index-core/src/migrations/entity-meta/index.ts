//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import indexes from './0003_indexes.sql?raw';

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

const addColumns = (columns: ReadonlyArray<readonly [name: string, ddl: string]>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const existing = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
    const present = new Set(existing.map((column) => column.name));
    for (const [name, ddl] of columns) {
      if (!present.has(name)) {
        yield* sql.unsafe(`ALTER TABLE objectMeta ADD COLUMN ${ddl}`);
      }
    }
  });

const addMissingColumns = addColumns(LATER_COLUMNS);

/**
 * The global position a feed block was assigned, denormalized out of the indexed snapshot so a
 * cursor read (`queuePosition > ?` ordered and limited) is an index seek rather than a full feed
 * scan. Null for automerge objects and for local blocks not yet positioned.
 */
const addQueuePosition = Effect.gen(function* () {
  yield* addColumns([['queuePosition', 'queuePosition INTEGER']]);
  const sql = yield* SqlClient.SqlClient;
  yield* sql.unsafe('CREATE INDEX IF NOT EXISTS idx_object_index_queuePosition ON objectMeta(queueId, queuePosition)');
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
  '0004_queue_position': addQueuePosition,
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'entity_meta_migrations';
