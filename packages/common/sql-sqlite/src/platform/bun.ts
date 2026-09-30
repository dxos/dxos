//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-bun/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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
 * Creates a file-based SQLite layer for Bun.
 * Unlike layerMemory, this persists data across runtime restarts.
 * Creates the parent directory if it does not already exist, since `bun:sqlite`
 * requires it to be present before opening the database file.
 */
export const layerFile = (
  filename: string,
): Layer.Layer<
  SqlClient.SqlClient | SqliteClient.SqliteClient | SqlExport.SqlExport,
  ConfigError.ConfigError | SqlError.SqlError
> => {
  mkdirSync(dirname(filename), { recursive: true });
  return sqlExportLayer.pipe(
    Layer.provideMerge(
      SqliteClient.layer({
        filename,
      }),
    ),
  );
};
