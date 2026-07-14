//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { Database, Obj, Ref } from '@dxos/echo';

import { Connector, ConnectorOperation } from '../types';
import { CursorsQuery, isCursorForConnection } from '../util';

const handler: Operation.WithHandler<typeof ConnectorOperation.SyncConnection> = ConnectorOperation.SyncConnection.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection: connectionRef }) {
      const connectionTarget = connectionRef.target;
      const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
      if (!db) {
        return { synced: 0 };
      }

      const connection = yield* Database.load(connectionRef).pipe(Effect.provide(Database.layer(db)));
      const connectors = (yield* Capability.Service).getAll(Connector).flat();
      const connector = connectors.find((entry) => entry.id === connection.connectorId);
      if (!connector?.sync) {
        return { synced: 0 };
      }

      const cursors = yield* Database.query(CursorsQuery).run.pipe(
        Effect.provide(Database.layer(db)),
        Effect.map((results) => results.filter((cursor) => isCursorForConnection(cursor, connection))),
        Effect.orElseSucceed(() => [] as Cursor.Cursor[]),
      );

      const sync = connector.sync;
      const spaceId = db.spaceId;
      yield* Effect.all(
        cursors.map((cursor) => Operation.invoke(sync, { binding: Ref.make(cursor) }, { spaceId })),
        { concurrency: 'unbounded' },
      );

      return { synced: cursors.length };
    }),
  ),
);

export default handler;
