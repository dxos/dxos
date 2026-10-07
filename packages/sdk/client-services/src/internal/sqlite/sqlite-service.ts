//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/sql/SqlClient';

import * as ComputeSqliteService from '@dxos/compute/SqliteService';
import { SqliteService } from '@dxos/protocols/rpc';

const toWireRow = (row: ComputeSqliteService.Row): Record<string, SqliteService.SqlValue> =>
  Object.fromEntries(Object.entries(row).map(([column, value]) => [column, SqliteService.toSqlValue(value)]));

/**
 * Serves `SqliteService` RPCs from the host's shared database through the sanitizing backend.
 */
export const SqliteServiceLayer: Layer.Layer<SqliteService.Tag, never, SqlClient.SqlClient> = Layer.effect(
  SqliteService.Tag,
  Effect.gen(function* () {
    const backend = yield* ComputeSqliteService.SqliteService;
    const handlers: SqliteService.Handlers = {
      'SqliteService.execute': (request) =>
        backend.execute(request).pipe(Effect.map((rows) => ({ rows: rows.map(toWireRow) }))),
    };
    return handlers;
  }),
).pipe(Layer.provide(ComputeSqliteService.layerGuarded), Layer.orDie);
