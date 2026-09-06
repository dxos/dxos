//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

/**
 * SQLite client layer for the ambient runtime: the CLI runs on Bun (`bun:sqlite`), the test
 * suite on Node (`node:sqlite`). Selected by dynamic import because neither driver loads
 * under the other runtime.
 */
export const clientLayer = (filename: string): Layer.Layer<SqlClient.SqlClient> =>
  Layer.unwrap(
    Effect.promise(async (): Promise<Layer.Layer<SqlClient.SqlClient>> => {
      if (typeof globalThis.Bun !== 'undefined') {
        const { SqliteClient } = await import('@effect/sql-sqlite-bun');
        return SqliteClient.layer({ filename });
      }
      const { SqliteClient } = await import('@effect/sql-sqlite-node');
      return SqliteClient.layer({ filename });
    }),
  );
