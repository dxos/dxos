//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

import * as ConnectorOperation from '../types/ConnectorOperation';
import { suspendConnectionBindings } from '../util';

const handler: Operation.WithHandler<typeof ConnectorOperation.DeleteConnection> =
  ConnectorOperation.DeleteConnection.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ connection: connectionRef }) {
        const connectionTarget = connectionRef.target;
        const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
        if (!db) {
          return { suspended: 0 };
        }

        const connection = yield* Database.load(connectionRef).pipe(Effect.provide(Database.layer(db)));
        // Suspend before the removal: the bindings are resolved by matching the connection's access
        // token, which the removal cascades away with the connection that owns it.
        const suspended = yield* suspendConnectionBindings(connection).pipe(Effect.provide(Database.layer(db)));
        // Routed through the space operation so an open plank closes and the removal joins the undo stack.
        yield* Operation.invoke(SpaceOperation.RemoveObjects, { objects: [connection] });
        return { suspended };
      }),
    ),
  );

export default handler;
