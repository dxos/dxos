//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as Schema from 'effect/Schema';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlConnection from 'effect/sql/SqlConnection';
import * as SqlError from 'effect/sql/SqlError';
import * as Statement from 'effect/sql/Statement';
import * as Stream from 'effect/Stream';

import { type ExecuteRequest, type Row, authorizationError, makeGuardedExecutor } from './internal/sqlite-guard.ts';

export type { ExecuteRequest, Row } from './internal/sqlite-guard.ts';
export { type Analysis, type SanitizeResult, sanitize } from './internal/sqlite-sanitizer.ts';

export const DatabaseOptions = Schema.Struct({
  /** Namespace that owns the tables this client creates; other databases cannot read or write them. */
  name: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_.:-]{1,128}$/)),
});
export interface DatabaseOptions extends Schema.Schema.Type<typeof DatabaseOptions> {}

export interface Service {
  /** Executes a single sanitized statement and returns its rows. */
  readonly execute: (request: ExecuteRequest) => Effect.Effect<ReadonlyArray<Row>, SqlError.SqlError>;
}

/**
 * SQLite database access for operations and processes.
 * Locally it is served by the client services host; on EDGE only durable operations get it,
 * backed by their own Durable Object storage.
 */
export class SqliteService extends Context.Service<SqliteService, Service>()('@dxos/compute/SqliteService') {}

/** Re-exported so callers importing this module as a namespace avoid `SqliteService.SqliteService.key`. */
export const key = SqliteService.key;

/**
 * Provides an Effect `SqlClient` bound to the named database.
 * Transactions are not supported: the backing connection may be shared with the host.
 */
export const database = (options: DatabaseOptions): Layer.Layer<SqlClient.SqlClient, never, SqliteService> =>
  Layer.effect(
    SqlClient.SqlClient,
    Effect.gen(function* () {
      const { name } = yield* Schema.decodeUnknownEffect(DatabaseOptions)(options).pipe(Effect.orDie);
      const service = yield* SqliteService;
      const connection = makeConnection(service, name);
      return yield* SqlClient.make({
        acquirer: Effect.succeed(connection),
        transactionAcquirer: Effect.fail(authorizationError('Transactions are not supported by SqliteService.')),
        compiler: Statement.makeCompilerSqlite(),
        spanAttributes: [
          ['db.system.name', 'sqlite'],
          ['dxos.sqlite.database', name],
        ],
      });
    }),
  ).pipe(Layer.provide(Reactivity.layer));

/**
 * Backend over a host `SqlClient` that enforces the sanitizer and per-database table ownership.
 */
export const layerGuarded: Layer.Layer<SqliteService, SqlError.SqlError, SqlClient.SqlClient> = Layer.effect(
  SqliteService,
  makeGuardedExecutor(),
);

/** For runtimes that must not offer SQLite, e.g. non-durable EDGE operations. */
export const notAvailable: Layer.Layer<SqliteService> = Layer.succeed(SqliteService, {
  execute: () =>
    Effect.fail(
      new SqlError.SqlError({
        reason: new SqlError.ConnectionError({
          cause: new Error('SqliteService not available'),
          message: 'SqliteService is not available in this runtime',
        }),
      }),
    ),
});

const makeConnection = (service: Service, database: string): SqlConnection.Connection => {
  const run = (sql: string, params: ReadonlyArray<unknown>) => service.execute({ database, sql, params });
  const rows = (
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
  ) => run(sql, params).pipe(Effect.map((result) => (transformRows ? transformRows(result) : result)));
  const values = (sql: string, params: ReadonlyArray<unknown>) =>
    run(sql, params).pipe(Effect.map((result) => result.map((row) => Object.values(row))));

  return {
    execute: rows,
    executeRaw: run,
    executeStream: (sql, params, transformRows) => Stream.fromIterableEffect(rows(sql, params, transformRows)),
    executeValues: values,
    executeValuesUnprepared: values,
    executeUnprepared: rows,
  };
};
