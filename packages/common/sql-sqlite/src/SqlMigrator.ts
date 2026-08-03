//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import * as SqlMigrations from './SqlMigrations';
import { SqlTransaction } from './SqlTransaction';

/**
 * A numbered, immutable migration. `id` orders application and is recorded in the migrations
 * table; `sql` may contain several statements.
 */
export interface Migration {
  readonly id: number;
  readonly name: string;
  readonly sql: string;
}

/**
 * Records migrations as applied without executing them, for databases that predate migration
 * tracking.
 *
 * Stores previously created their tables with `CREATE TABLE IF NOT EXISTS` on every open and
 * recorded nothing, so an existing database is indistinguishable from a fresh one by the
 * migrations table alone. This is the equivalent of `prisma migrate resolve --applied`, which is
 * unavailable to us because it needs a live database and a prisma engine.
 */
export interface Baseline {
  /** Migrations up to and including this id are recorded rather than executed. */
  readonly throughId: number;
  /** Identifies a database created before migration tracking, e.g. {@link tableExists}. */
  readonly when: Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient>;
}

/**
 * A migration manifest that cannot be applied, or a database whose history contradicts it.
 *
 * Always a defect rather than a recoverable condition: the manifest is bundled with the code, so
 * any of these means the build is wrong, not that the environment is misbehaving.
 */
export class SqlMigrationError extends Data.TaggedError('SqlMigrationError')<{
  readonly reason: 'duplicate-id' | 'checksum-mismatch';
  readonly message: string;
}> {}

/**
 * Whether a table is present, for use as a {@link Baseline} predicate.
 *
 * Reads `sqlite_master` rather than a `PRAGMA`, since Durable Object SQL restricts pragmas.
 */
export const tableExists = (name: string): Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${name}
    `.withoutTransform;
    return rows.length > 0;
  });

/**
 * Fingerprints a migration so an edit to one already applied can be detected.
 *
 * Two FNV-1a passes with different offset bases, giving 64 bits without a crypto import — this
 * has to run identically in node, workerd, and the browser, and `crypto.subtle` is async.
 * Line endings are normalised so a platform checkout difference is not reported as an edit.
 */
const checksum = (sql: string): string => {
  const normalized = sql.replace(/\r\n/g, '\n').trimEnd();
  const hash = (offset: number): string => {
    let value = offset;
    for (let index = 0; index < normalized.length; ++index) {
      value ^= normalized.charCodeAt(index);
      value = Math.imul(value, 0x01000193) >>> 0;
    }
    return value.toString(16).padStart(8, '0');
  };
  return hash(0x811c9dc5) + hash(0x01000193);
};

type Applied = { migration_id: number; name: string; checksum: string };

const ensureTable = (table: string): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`CREATE TABLE IF NOT EXISTS ${sql(table)} (
      migration_id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`;
  });

const record = (
  table: string,
  migrations: ReadonlyArray<Migration>,
  now: number,
): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO ${sql(table)} ${sql.insert(
      migrations.map((migration) => ({
        migration_id: migration.id,
        name: migration.name,
        checksum: checksum(migration.sql),
        created_at: now,
      })),
    )}`.withoutTransform;
  });

/**
 * Applies migrations the database has not recorded yet, and records them.
 *
 * Runs inside {@link SqlTransaction} rather than `SqlClient.withTransaction`. That is not a style
 * preference: the client's implementation emits literal `BEGIN` / `COMMIT`, which workerd forbids,
 * so a Durable Object must supply its own layer backed by `ctx.storage.transaction()`. Using the
 * client's transaction directly is what makes `@effect/sql`'s own `Migrator` unusable in a DO.
 *
 * Pending work is a **set difference** against the recorded ids, not everything above the highest
 * one, so a migration added below a shipped id is still applied rather than silently skipped. Each
 * migration's SQL is fingerprinted, so editing one that a database already applied is reported
 * instead of ignored.
 *
 * @example
 * ```typescript
 * yield* SqlMigrator.run({
 *   table: 'feed_migrations',
 *   migrations: MIGRATIONS,
 *   baseline: { throughId: 1, when: SqlMigrator.tableExists('feeds') },
 * });
 * ```
 */
export const run = (options: {
  readonly table: string;
  readonly migrations: ReadonlyArray<Migration>;
  readonly baseline?: Baseline;
  /** Timestamp recorded against applied migrations; defaults to now. */
  readonly now?: number;
}): Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlMigrationError | SqlError.SqlError,
  SqlClient.SqlClient | SqlTransaction
> =>
  Effect.gen(function* () {
    const { table, migrations, baseline } = options;

    const duplicate = migrations.find(
      (migration, index) => migrations.findIndex((other) => other.id === migration.id) !== index,
    );
    if (duplicate) {
      return yield* new SqlMigrationError({
        reason: 'duplicate-id',
        message: `Duplicate migration id ${duplicate.id} ("${duplicate.name}") in ${table}`,
      });
    }

    const sql = yield* SqlClient.SqlClient;
    const transaction = yield* SqlTransaction;
    const ordered = [...migrations].sort((left, right) => left.id - right.id);

    // The table has to exist before the history can be read, and `IF NOT EXISTS` makes this safe
    // to repeat. Kept outside the transaction so a DO's storage transaction contains only DML.
    yield* ensureTable(table);

    return yield* transaction.withTransaction(
      Effect.gen(function* () {
        const applied = yield* sql<Applied>`
          SELECT migration_id, name, checksum FROM ${sql(table)}
        `.withoutTransform;
        const appliedById = new Map(applied.map((row) => [row.migration_id, row]));

        const drifted = ordered.find((migration) => {
          const row = appliedById.get(migration.id);
          return row !== undefined && row.checksum !== checksum(migration.sql);
        });
        if (drifted) {
          return yield* new SqlMigrationError({
            reason: 'checksum-mismatch',
            message:
              `Migration ${drifted.id} ("${drifted.name}") in ${table} was modified after it was applied. ` +
              'Applied migrations are immutable; add a new one instead.',
          });
        }

        const now = options.now ?? Date.now();

        // Stamp only a database with no history at all; once anything is recorded, the table is
        // authoritative and a baseline would be guessing.
        if (baseline && appliedById.size === 0 && (yield* baseline.when)) {
          const stamped = ordered.filter((migration) => migration.id <= baseline.throughId);
          if (stamped.length > 0) {
            yield* record(table, stamped, now);
            for (const migration of stamped) {
              appliedById.set(migration.id, {
                migration_id: migration.id,
                name: migration.name,
                checksum: checksum(migration.sql),
              });
            }
          }
        }

        const pending = ordered.filter((migration) => !appliedById.has(migration.id));
        for (const migration of pending) {
          yield* SqlMigrations.apply(migration.sql);
          // Recorded per migration rather than in one batch, so a failure part-way through leaves
          // the completed ones recorded if the surrounding transaction is a no-op implementation.
          yield* record(table, [migration], now);
        }

        return pending.map((migration) => [migration.id, migration.name] as const);
      }),
    );
  });
