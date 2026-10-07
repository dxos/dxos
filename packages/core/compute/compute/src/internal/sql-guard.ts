//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import * as SqlError from 'effect/sql/SqlError';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/sql-service/index.ts';
import { sanitize } from './sql-sanitizer.ts';

export type Row = Readonly<Record<string, unknown>>;

export type ExecuteRequest = {
  readonly database: string;
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
};

const OBJECTS_TABLE = 'dx_sql_service_objects';

export const authorizationError = (message: string): SqlError.SqlError =>
  new SqlError.SqlError({
    reason: new SqlError.AuthorizationError({ cause: new Error(message), message, operation: 'sanitize' }),
  });

/**
 * Executes sanitized statements on a shared SqlClient.
 * Every schema object is owned by the database that created it (recorded in `dx_sql_service_objects`);
 * a statement that names an object owned by another database, or by the host, is rejected.
 */
export const makeGuardedExecutor = Effect.fn('SqlService.makeGuardedExecutor')(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    Effect.mapError((error) =>
      error instanceof SqlError.SqlError
        ? error
        : new SqlError.SqlError({
            reason: new SqlError.UnknownError({ cause: error, message: 'SqlService migration failed' }),
          }),
    ),
  );

  const owners = (names: readonly string[]) =>
    sql
      .unsafe<{ name: string; owner: string | null }>(
        `SELECT lower(m.name) AS name, o.database AS owner FROM sqlite_master m ` +
          `LEFT JOIN ${OBJECTS_TABLE} o ON o.name = lower(m.name) ` +
          `WHERE lower(m.name) IN (${names.map(() => '?').join(', ')})`,
        names,
      )
      .pipe(Effect.map((rows) => new Map(rows.map((row) => [row.name, row.owner]))));

  const execute = Effect.fn('SqlService.execute')(function* ({ database, sql: statement, params }: ExecuteRequest) {
    const result = sanitize(statement);
    if (!result.ok) {
      return yield* authorizationError(result.reason);
    }

    const { tables, created, dropped, renamed } = result.analysis;
    if (tables.length > 0) {
      const existing = yield* owners(tables);
      for (const [name, owner] of existing) {
        if (owner !== database) {
          return yield* authorizationError(`Access to ${name} is not allowed.`);
        }
      }
    }

    const rows = yield* sql.unsafe<Row>(statement, params);

    if (created !== undefined) {
      yield* sql.unsafe(
        `INSERT OR IGNORE INTO ${OBJECTS_TABLE} (name, database) ` +
          `SELECT lower(name), ? FROM sqlite_master WHERE lower(name) = ?`,
        [database, created],
      );
    }
    if (renamed !== undefined) {
      yield* sql.unsafe(`UPDATE ${OBJECTS_TABLE} SET name = ? WHERE name = ? AND database = ?`, [
        renamed.to,
        renamed.from,
        database,
      ]);
    }
    if (dropped !== undefined) {
      // Dropping a table also drops its indexes and triggers.
      yield* sql.unsafe(
        `DELETE FROM ${OBJECTS_TABLE} WHERE database = ? AND name NOT IN (SELECT lower(name) FROM sqlite_master)`,
        [database],
      );
    }

    return rows;
  });

  return { execute };
});
