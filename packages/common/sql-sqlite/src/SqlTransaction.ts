//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

export interface Service {
  withTransaction: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | SqlError.SqlError, R>;
}

/**
 * Provide a SQL transaction context.
 *
 * Should be used instead of SqlClient.withTransaction() or SQL native transaction syntaxes (e.g. `BEGIN; COMMIT;`).
 *
 * Platform runtimes (e.g. edge, Durable Objects) can provide alternative implementations by supplying a custom
 * `SqlTransaction` layer.
 *
 * @example
 * ```typescript
 * const transaction = yield* SqlTransaction;
 * yield* transaction.withTransaction(Effect.gen(function* () {
 *   yield* sql.execute('SELECT * FROM users');
 * }));
 * ```
 */
export class SqlTransaction extends Context.Service<SqlTransaction, Service>()('@dxos/sql-sqlite/SqlTransaction') {}

/**
 * Default `SqlTransaction` layer backed by `SqlClient.withTransaction`.
 */
export const layer: Layer.Layer<SqlTransaction, never, SqlClient.SqlClient> = Layer.effect(
  SqlTransaction,
  Effect.map(SqlClient.SqlClient, (sql: SqlClient.SqlClient): Service => ({
    withTransaction: (self) => sql.withTransaction(self),
  })),
);

/**
 * Replaces `SqlClient` with one whose `withTransaction` delegates to {@link SqlTransaction}.
 *
 * Lets library code that calls `sql.withTransaction` — `@effect/sql`'s `Migrator`, for instance —
 * run on platforms where the client's own implementation cannot. That implementation emits literal
 * `BEGIN` / `COMMIT`, which workerd rejects, so a Durable Object supplies a `SqlTransaction` backed
 * by `ctx.storage.transaction()` instead.
 *
 * Provide it around the code that needs it, so a platform that composes the raw client still gets
 * the right behaviour without changing how it builds its layers:
 *
 * @example
 * ```typescript
 * yield* libraryEffect.pipe(Effect.provide(SqlTransaction.clientLayer));
 * ```
 *
 * A `Proxy` rather than a copy because the client is a callable tagged-template function: spreading
 * it drops the call signature, and `Object.assign` would silently omit non-enumerable members.
 *
 * When composing this into a layer stack rather than providing it locally, the underlying client
 * must appear only in `Layer.provide` — merging it into the output as well shadows this one back
 * out, silently and without a type error.
 */
export const clientLayer: Layer.Layer<SqlClient.SqlClient, never, SqlClient.SqlClient | SqlTransaction> = Layer.effect(
  SqlClient.SqlClient,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const transaction = yield* SqlTransaction;
    return new Proxy(sql, {
      get: (target, property, receiver) =>
        property === 'withTransaction' ? transaction.withTransaction : Reflect.get(target, property, receiver),
    });
  }),
);
