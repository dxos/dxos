//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/ConfigError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as SqlExport from '../SqlExport';

export const sqlExportLayer: Layer.Layer<SqlExport.SqlExport, SqlError.SqlError, SqliteClient.SqliteClient> =
  Layer.effect(
    SqlExport.SqlExport,
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      return {
        export: sql.export,
      } satisfies SqlExport.Service;
    }),
  );

export const layerMemory: Layer.Layer<
  SqlClient.SqlClient | SqliteClient.SqliteClient | SqlExport.SqlExport,
  ConfigError.ConfigError | SqlError.SqlError
> = sqlExportLayer.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
);

/**
 * Creates a file-based SQLite layer for Node.js.
 * Unlike layerMemory, this persists data across runtime restarts.
 */
export const layerFile = (
  filename: string,
): Layer.Layer<
  SqlClient.SqlClient | SqliteClient.SqliteClient | SqlExport.SqlExport,
  ConfigError.ConfigError | SqlError.SqlError
> =>
  sqlExportLayer.pipe(
    Layer.provideMerge(
      SqliteClient.layer({
        filename,
      }),
    ),
  );
