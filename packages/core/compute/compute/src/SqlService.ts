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

import { type ExecuteRequest, type Row, authorizationError, makeGuardedExecutor } from './internal/sql-guard.ts';

export type { ExecuteRequest, Row } from './internal/sql-guard.ts';
export { type Analysis, type SanitizeResult, sanitize } from './internal/sql-sanitizer.ts';

export const DatabaseOptions = Schema.Struct({
  /** Namespace that owns the tables this client creates; other databases cannot read or write them. */
  name: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_.:-]{1,128}$/)),
});
export interface DatabaseOptions extends Schema.Schema.Type<typeof DatabaseOptions> {}

export interface Service {
  /** Executes a single sanitized statement and returns its rows. */
  readonly execute: (request: ExecuteRequest) => Effect.Effect<ReadonlyArray<Row>, SqlError.SqlError>;
  /** Opens a transaction; statements that pass its id run inside it until `commit` or `rollback`. */
  readonly begin: (request: {
    readonly database: string;
  }) => Effect.Effect<{ readonly transaction: string }, SqlError.SqlError>;
  readonly commit: (request: { readonly transaction: string }) => Effect.Effect<void, SqlError.SqlError>;
  readonly rollback: (request: { readonly transaction: string }) => Effect.Effect<void, SqlError.SqlError>;
}

/**
 * SQLite database access for operations and processes.
 * Locally it is served by the client services host; on EDGE only durable operations get it,
 * backed by their own Durable Object storage.
 */
export class SqlService extends Context.Service<SqlService, Service>()('@dxos/compute/SqlService') {}

/** Re-exported so callers importing this module as a namespace avoid `SqlService.SqlService.key`. */
export const key = SqlService.key;

/**
 * Provides an Effect `SqlClient` bound to the named database.
 * `withTransaction` is supported; nested transactions (savepoints) are not.
 */
export const database = (options: DatabaseOptions): Layer.Layer<SqlClient.SqlClient, never, SqlService> =>
  Layer.effect(
    SqlClient.SqlClient,
    Effect.gen(function* () {
      const { name } = yield* Schema.decodeUnknownEffect(DatabaseOptions)(options).pipe(Effect.orDie);
      const service = yield* SqlService;
      const connection = makeConnection(service, name);
      const transactionAcquirer = Effect.gen(function* () {
        const { transaction } = yield* service.begin({ database: name });
        const state: TransactionState = { id: transaction, open: true };
        yield* Effect.addFinalizer(() =>
          state.open ? service.rollback({ transaction }).pipe(Effect.ignore) : Effect.void,
        );
        return makeConnection(service, name, state);
      });
      return yield* SqlClient.make({
        acquirer: Effect.succeed(connection),
        transactionAcquirer,
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
export const layerGuarded: Layer.Layer<SqlService, SqlError.SqlError, SqlClient.SqlClient> = Layer.effect(
  SqlService,
  makeGuardedExecutor(),
);

const unavailable = Effect.fail(
  new SqlError.SqlError({
    reason: new SqlError.ConnectionError({
      cause: new Error('SqlService not available'),
      message: 'SqlService is not available in this runtime',
    }),
  }),
);

/** For runtimes that must not offer SQLite, e.g. non-durable EDGE operations. */
export const notAvailable: Layer.Layer<SqlService> = Layer.succeed(SqlService, {
  execute: () => unavailable,
  begin: () => unavailable,
  commit: () => unavailable,
  rollback: () => unavailable,
});

type TransactionState = { readonly id: string; open: boolean };

const SAVEPOINT = /^(SAVEPOINT|ROLLBACK TO SAVEPOINT|RELEASE SAVEPOINT)\s/i;

/**
 * A transaction connection receives the client's control statements as SQL; they map to the
 * service's transaction calls rather than reaching the host, which rejects them.
 */
const runInTransaction = (
  service: Service,
  database: string,
  state: TransactionState,
  sql: string,
  params: ReadonlyArray<unknown>,
): Effect.Effect<ReadonlyArray<Row>, SqlError.SqlError> => {
  switch (sql.trim().toUpperCase()) {
    case 'BEGIN':
      return Effect.succeed([]);
    case 'COMMIT':
    case 'ROLLBACK': {
      state.open = false;
      const end = sql.trim().toUpperCase() === 'COMMIT' ? service.commit : service.rollback;
      return end({ transaction: state.id }).pipe(Effect.as([]));
    }
  }
  if (SAVEPOINT.test(sql.trim())) {
    return Effect.fail(authorizationError('Nested transactions are not supported by SqlService.'));
  }
  return service.execute({ database, sql, params, transaction: state.id });
};

const makeConnection = (
  service: Service,
  database: string,
  transaction?: TransactionState,
): SqlConnection.Connection => {
  const run = (sql: string, params: ReadonlyArray<unknown>) =>
    transaction
      ? runInTransaction(service, database, transaction, sql, params)
      : service.execute({ database, sql, params });
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
