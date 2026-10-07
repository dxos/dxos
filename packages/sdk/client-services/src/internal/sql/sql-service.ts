//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/sql/SqlClient';

import * as ComputeSqlService from '@dxos/compute/SqlService';
import { SqlService } from '@dxos/protocols/rpc';

const toWireRow = (row: ComputeSqlService.Row): Record<string, SqlService.SqlValue> =>
  Object.fromEntries(Object.entries(row).map(([column, value]) => [column, SqlService.toSqlValue(value)]));

/**
 * Serves `SqlService` RPCs from the host's shared database through the sanitizing backend.
 */
export const SqlServiceLayer: Layer.Layer<SqlService.Tag, never, SqlClient.SqlClient> = Layer.effect(
  SqlService.Tag,
  Effect.gen(function* () {
    const backend = yield* ComputeSqlService.SqlService;
    const handlers: SqlService.Handlers = {
      'SqlService.execute': (request) =>
        backend.execute(request).pipe(Effect.map((rows) => ({ rows: rows.map(toWireRow) }))),
      'SqlService.begin': (request) => backend.begin(request),
      'SqlService.commit': (request) => backend.commit(request),
      'SqlService.rollback': (request) => backend.rollback(request),
    };
    return handlers;
  }),
).pipe(Layer.provide(ComputeSqlService.layerGuarded), Layer.orDie);
