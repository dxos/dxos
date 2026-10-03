//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../../migrations/index.ts';

/**
 * Applies any migrations this database has not recorded yet.
 */
export const migrate = (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('pipeline-rdf.migrate'),
  );
