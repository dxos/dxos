//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import * as SqlError from 'effect/unstable/sql/SqlError';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import * as SqlExport from '../SqlExport.ts';

// Effect 4's node client dropped `export`, and `node:sqlite` exposes no `serialize`, so SQLite's
// online backup into a scratch file is the remaining way to take a consistent snapshot.
const exportViaBackup = (sql: SqliteClient.SqliteClient): Effect.Effect<Uint8Array, SqlError.SqlError> =>
  Effect.scoped(
    Effect.gen(function* () {
      const file = join(tmpdir(), `dxos-sql-export-${randomUUID()}.db`);
      yield* Effect.acquireRelease(sql.backup(file), () => Effect.promise(() => rm(file, { force: true })));
      const contents = yield* Effect.tryPromise({
        try: () => readFile(file),
        catch: (cause) =>
          new SqlError.SqlError({
            reason: new SqlError.UnknownError({
              cause,
              message: 'Failed to read exported database',
              operation: 'export',
            }),
          }),
      });
      return new Uint8Array(contents);
    }),
  );

export const sqlExportLayer: Layer.Layer<SqlExport.SqlExport, SqlError.SqlError, SqliteClient.SqliteClient> =
  Layer.effect(
    SqlExport.SqlExport,
    Effect.gen(function* () {
      const sql = yield* SqliteClient.SqliteClient;
      return {
        export: exportViaBackup(sql),
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
 * Creates the parent directory if it does not already exist, since better-sqlite3
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
