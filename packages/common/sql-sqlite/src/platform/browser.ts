//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import * as SqlExport from '../SqlExport.ts';

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
  SqlClient.SqlClient | SqlExport.SqlExport,
  ConfigError.ConfigError | SqlError.SqlError
> = sqlExportLayer.pipe(Layer.provideMerge(SqliteClient.layerMemory({})));

/**
 * File-based SQLite is not available in browser.
 * Use OPFS worker for persistent storage in browser environments.
 * @throws Always throws - use OPFS worker instead.
 */
export const layerFile = (
  _filename: string,
): Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport, ConfigError.ConfigError | SqlError.SqlError> => {
  throw new Error('layerFile is not available in browser. Use OPFS worker for persistent storage.');
};
