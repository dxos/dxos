//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation, RunAgainError } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { connectionDeckSubject } from '../constants';
import { ConnectionAuthExpiredError, isUnauthorizedError } from '../errors';
import { Connector, ConnectorOperation } from '../types';
import { isCursorForConnection } from '../util';

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

      const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run.pipe(
        Effect.provide(Database.layer(db)),
        Effect.map((results) => results.filter((cursor) => isCursorForConnection(cursor, connection))),
        Effect.orElseSucceed(() => [] as Cursor.Cursor[]),
      );

      const sync = connector.sync;
      const spaceId = db.spaceId;
      // Serialized invocation the reauth toast runs on click — it rides on the error across the process
      // failure boundary, so it's data (operation key + input), not a live callback.
      const openConnection = Operation.prepare(LayoutOperation.Open, {
        subject: [connectionDeckSubject(Paths.getSpacePath(spaceId), connection.id)],
        navigation: 'immediate',
      });
      yield* Effect.all(
        cursors.map((cursor) =>
          Effect.gen(function* () {
            // A capped sync run requests `Operation.runAgain()` to pick up where it left off; that
            // surfaces here as a `RunAgainError` defect (same promotion path as any other handler
            // failure — see below), so loop until an invocation completes without requesting one.
            while (true) {
              const outcome = yield* Operation.invoke(sync, { binding: Ref.make(cursor) }, { spaceId }).pipe(
                Effect.map((value) => ({ runAgain: false as const, value })),
                // A nested `Operation.invoke` runs as a tracked child process; `Process.fromOperation`
                // unconditionally promotes whatever the handler fails with to a defect (`Effect.orDie`)
                // before it reaches the caller, so retagging 401s here must intercept the defect
                // channel — `Effect.mapError` never sees it.
                Effect.catchAllDefect((defect) =>
                  RunAgainError.is(defect)
                    ? Effect.succeed({ runAgain: true as const, value: undefined })
                    : isUnauthorizedError(defect)
                      ? Effect.fail(
                          new ConnectionAuthExpiredError({
                            connectionId: connection.id,
                            action: openConnection,
                            cause: defect,
                          }),
                        )
                      : Effect.die(defect),
                ),
              );
              if (!outcome.runAgain) {
                return outcome.value;
              }
            }
          }),
        ),
        { concurrency: 'unbounded' },
      );

      return { synced: cursors.length };
    }),
  ),
);

export default handler;
