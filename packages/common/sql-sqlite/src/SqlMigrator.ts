//
// Copyright 2026 DXOS.org
//

import * as Migrator from '@effect/sql/Migrator';
import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import * as SqlMigrations from './SqlMigrations';

/**
 * A numbered, immutable migration. `id` orders application and is what gets recorded in the
 * migrations table; `sql` may contain several statements.
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
 * migrations table alone — and running migration 1 against it would fail on the first
 * `CREATE TABLE`. This is the equivalent of `prisma migrate resolve --applied`.
 */
export interface Baseline {
  /** Migrations up to and including this id are stamped rather than run. */
  readonly throughId: number;
  /** Identifies a database created before migration tracking, e.g. {@link tableExists}. */
  readonly when: Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient>;
}

/**
 * Whether a table is present, for use as a {@link Baseline} predicate.
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
 * Mirrors the table `@effect/sql`'s migrator creates for non-postgres dialects. Declared here
 * because a baseline has to be stamped before the migrator runs, and the migrator only creates
 * the table on its own first run. Both statements are `IF NOT EXISTS`, so whichever executes
 * first wins and the other is a no-op; `stamps a legacy database` in the tests covers the
 * compatibility this assumes.
 */
const ensureTable = (table: string): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`CREATE TABLE IF NOT EXISTS ${sql(table)} (
      migration_id integer PRIMARY KEY NOT NULL,
      created_at datetime NOT NULL DEFAULT current_timestamp,
      name VARCHAR(255) NOT NULL
    )`;
  });

const stamp = (
  table: string,
  migrations: ReadonlyArray<Migration>,
  baseline: Baseline,
): Effect.Effect<ReadonlyArray<Migration>, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* ensureTable(table);

    // Only ever stamp a database that has no migration history; once anything is recorded the
    // migrator's own bookkeeping is authoritative.
    const recorded = yield* sql<{ migration_id: number }>`
      SELECT migration_id FROM ${sql(table)}
    `.withoutTransform;
    if (recorded.length > 0 || !(yield* baseline.when)) {
      return [];
    }

    const stamped = migrations.filter((migration) => migration.id <= baseline.throughId);
    if (stamped.length > 0) {
      yield* sql`INSERT INTO ${sql(table)} ${sql.insert(stamped.map(({ id, name }) => ({ migration_id: id, name })))}`
        .withoutTransform;
    }
    return stamped;
  });

/**
 * Applies pending migrations and records them, skipping any already present in `table`.
 *
 * Built on `@effect/sql`'s migrator via `Migrator.make({})` — omitting `dumpSchema` keeps the
 * requirement at `SqlClient` alone, unlike the platform-specific `SqliteMigrator` entry points,
 * which additionally demand `FileSystem`, `Path`, and `CommandExecutor` and so cannot run in the
 * browser.
 *
 * Note the migrator advances a high-water mark rather than diffing the applied set: a migration
 * numbered at or below the highest recorded id is skipped permanently. Number migrations
 * strictly monotonically, and never insert one below an id that has shipped.
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
}): Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError.SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function* () {
    if (options.baseline) {
      yield* stamp(options.table, options.migrations, options.baseline);
    }

    const loader = Migrator.fromRecord(
      Object.fromEntries(
        options.migrations.map((migration) => [
          `${String(migration.id).padStart(4, '0')}_${migration.name}`,
          SqlMigrations.apply(migration.sql),
        ]),
      ),
    );

    return yield* Migrator.make({})({ loader, table: options.table });
  });
