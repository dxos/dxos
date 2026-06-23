//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';

import { Connector, ConnectorOperation, SyncBinding } from '../types';

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

      const bindings = yield* Database.query(
        Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding),
      ).run.pipe(
        Effect.provide(Database.layer(db)),
        Effect.map((results) => [...results]),
        Effect.orElseSucceed(() => [] as SyncBinding.SyncBinding[]),
      );

      const sync = connector.sync;
      const spaceId = db.spaceId;
      yield* Effect.all(
        bindings.map((binding) => Operation.invoke(sync, { binding: Ref.make(binding) }, { spaceId })),
        { concurrency: 'unbounded' },
      );

      return { synced: bindings.length };
    }),
  ),
);

export default handler;
