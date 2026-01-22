//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/ConfigError';
import * as Layer from 'effect/Layer';
import * as Effect from 'effect/Effect';
import * as SqlExport from '../SqlExport';

const sqlExportNode: Layer.Layer<SqlExport.SqlExport, SqlError.SqlError, SqliteClient.SqliteClient> = Layer.effect(
  SqlExport.SqlExport,
  Effect.gen(function* () {
    const sql = yield* SqliteClient.SqliteClient;
    return {
      export: sql.export,
    } satisfies SqlExport.Service;
  }),
);

export const layerMemory: Layer.Layer<
  SqlClient.SqlClient | SqliteClient.SqliteClient,
  ConfigError.ConfigError | SqlError.SqlError
> = sqlExportNode.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
);
