//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext, Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter } from '@dxos/echo';
import { Connection } from '@dxos/link';

import { QueryMcpConnections } from './definitions.ts';

export default QueryMcpConnections.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const binder = yield* Harness.binder.pipe(Effect.orDie);
      yield* Effect.promise(() => binder.sync());
      const states = binder.getConnections();
      const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
      return connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        connectorId: connection.connectorId,
        enabled: AiContext.isConnectionOn(states, connection),
      }));
    }),
  ),
);
