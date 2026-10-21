//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';

import { SetMcpConnection } from './definitions.ts';

export default SetMcpConnection.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, enabled }) {
      const connection = (yield* Database.query(Filter.id(id)).run).find(Connection.instanceOf);
      if (!connection) {
        return yield* Effect.die(new Error(`No connection with id ${id}.`));
      }
      const binder = yield* Harness.binder.pipe(Effect.orDie);
      yield* Effect.promise(() => binder.setConnection(Ref.make(connection), enabled));
      return { id: connection.id, name: connection.name, connectorId: connection.connectorId, enabled };
    }),
  ),
);
