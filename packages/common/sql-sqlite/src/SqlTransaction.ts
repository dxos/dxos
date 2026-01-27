//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

export interface Service {
  withTransaction: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | SqlError.SqlError, R>;
}

/**
 * Provide a SQL transaction context.
 *
 * Should be used instead of SqlClient.withTransaction() or SQL native transaction syntaxes (e.g. `BEGIN; COMMIT;`).
 *
 * @example
 * ```typescript
 * const transaction = yield* SqlTransaction;
 * yield* transaction.withTransaction(Effect.gen(function* () {
 *   yield* sql.execute('SELECT * FROM users');
 * }));
 * ```
 */
export class SqlTransaction extends Context.Tag('@dxos/sql-sqlite/SqlTransaction')<SqlTransaction, Service>() {
  static layer: Layer.Layer<SqlTransaction, never, SqlClient.SqlClient> = Layer.effect(
    SqlTransaction,
    Effect.map(
      SqlClient.SqlClient,
      (sql: SqlClient.SqlClient): Context.Tag.Service<SqlTransaction> => ({
        withTransaction: (self) => sql.withTransaction(self),
      }),
    ),
  );
}
