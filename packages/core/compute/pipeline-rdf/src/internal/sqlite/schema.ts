//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../../migrations/index.ts';

/**
 * Applies any migrations this database has not recorded yet.
 *
 * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
 * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
 */
export const migrate = (): Effect.Effect<
  void,
  SqlError.SqlError,
  SqlClient.SqlClient | SqlTransaction.SqlTransaction
> =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('pipeline-rdf.migrate'),
  );
