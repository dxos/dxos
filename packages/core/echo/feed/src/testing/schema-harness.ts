//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { SqlMigrator } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations';

/**
 * The DDL the feed store shipped before its schema moved to prisma. Retained verbatim so the
 * generated migration can be proven equivalent for databases created by earlier releases —
 * those are real local-first user databases, and they are baselined rather than migrated.
 */
export const LEGACY_DDL = [
  `CREATE TABLE IF NOT EXISTS feeds (
    feedPrivateId INTEGER PRIMARY KEY AUTOINCREMENT,
    spaceId TEXT NOT NULL,
    feedId TEXT NOT NULL,
    feedNamespace TEXT
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_feeds_spaceId_feedId ON feeds(spaceId, feedId)',
  `CREATE TABLE IF NOT EXISTS blocks (
    insertionId INTEGER PRIMARY KEY AUTOINCREMENT,
    feedPrivateId INTEGER NOT NULL,
    position INTEGER,
    sequence INTEGER NOT NULL,
    actorId TEXT NOT NULL,
    prevSequence INTEGER,
    prevActorId TEXT,
    timestamp INTEGER NOT NULL,
    data BLOB NOT NULL,
    FOREIGN KEY(feedPrivateId) REFERENCES feeds(feedPrivateId)
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_feedPrivateId_position ON blocks(feedPrivateId, position)',
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_feedPrivateId_sequence_actorId
     ON blocks(feedPrivateId, sequence, actorId)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    subscriptionId TEXT PRIMARY KEY,
    expiresAt INTEGER NOT NULL,
    feedPrivateIds TEXT NOT NULL -- JSON array
  )`,
  `CREATE TABLE IF NOT EXISTS cursor_tokens (
    spaceId TEXT PRIMARY KEY,
    token TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    spaceId TEXT NOT NULL,
    feedNamespace TEXT NOT NULL,
    lastPulledPosition INTEGER NOT NULL DEFAULT -1,
    PRIMARY KEY (spaceId, feedNamespace)
  )`,
];

type TableInfo = { name: string; type: string; notnull: number; pk: number; dflt_value: string | null };
type IndexListEntry = { name: string; unique: number };
type ForeignKey = { from: string; table: string; to: string; on_delete: string; on_update: string };

/**
 * Runs the feed store's real migration configuration, including baselining.
 *
 * Resolves to the migrations that were actually executed — empty when everything was stamped or
 * already recorded. That distinction is what separates baselining from re-running, and cannot be
 * observed from the resulting schema, since migration 1 is `IF NOT EXISTS` and would appear to
 * succeed either way.
 */
export const migrate = (): Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError.SqlError,
  SqlClient.SqlClient
> =>
  SqlMigrator.run({
    table: MIGRATIONS_TABLE,
    migrations: MIGRATIONS,
    baseline: { throughId: 1, when: SqlMigrator.tableExists('feeds') },
    // Mirrors `FeedStore.migrate`, so the tests exercise the same error handling as production.
  }).pipe(Effect.catchTag('MigrationError', (error) => Effect.die(error)));

/**
 * Reads the physical shape of every user table, so two databases can be compared by what SQLite
 * actually stores rather than by the text of the DDL that produced them. The migrations table is
 * excluded — it is bookkeeping, and is present only after the migrator has run.
 *
 * Nullability of primary-key columns is deliberately excluded: prisma cannot express a nullable
 * `@id`, so it always emits `NOT NULL` on a primary key where the legacy DDL left it off. For an
 * `INTEGER PRIMARY KEY` that is cosmetic — it aliases the rowid and rejects NULL either way. For
 * a `TEXT PRIMARY KEY` it is a real tightening, pinned explicitly by its own test.
 */
export const describeSchema = Effect.fn('describeSchema')(function* () {
  const sql = yield* SqlClient.SqlClient;
  const tables = yield* sql<{ name: string }>`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != ${MIGRATIONS_TABLE}
    ORDER BY name
  `;

  const result: Record<string, { columns: string[]; indexes: string[]; foreignKeys: string[] }> = {};
  for (const { name } of tables) {
    const columns = yield* sql.unsafe<TableInfo>(`PRAGMA table_info("${name}")`);
    const indexList = yield* sql.unsafe<IndexListEntry>(`PRAGMA index_list("${name}")`);
    const foreignKeys = yield* sql.unsafe<ForeignKey>(`PRAGMA foreign_key_list("${name}")`);

    const indexes: string[] = [];
    for (const index of indexList.filter((entry) => !entry.name.startsWith('sqlite_'))) {
      const info = yield* sql.unsafe<{ name: string }>(`PRAGMA index_info("${index.name}")`);
      indexes.push(`${index.name}${index.unique ? ' UNIQUE' : ''}(${info.map((column) => column.name).join(',')})`);
    }

    result[name] = {
      columns: columns.map(
        (column) =>
          `${column.name} ${column.type}` +
          `${column.notnull && !column.pk ? ' NOT NULL' : ''}` +
          `${column.pk ? ` PK${column.pk}` : ''}` +
          `${column.dflt_value !== null ? ` DEFAULT ${column.dflt_value}` : ''}`,
      ),
      indexes: indexes.sort(),
      foreignKeys: foreignKeys
        .map((key) => `${key.from}->${key.table}.${key.to} ON DELETE ${key.on_delete} ON UPDATE ${key.on_update}`)
        .sort(),
    };
  }
  return result;
});
