//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, RunAgainError } from '@dxos/compute';
import { Database, Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { connectionDeckSubject } from '../constants';
import { ConnectionAuthExpiredError, isUnauthorizedError } from '../errors';
import { Connector, ConnectorOperation } from '../types';
import { isCursorForConnection, syncBinding } from '../util';

/** How many of a connection's bindings sync at once. */
const SYNC_CONCURRENCY = 2;

const handler: Operation.WithHandler<typeof ConnectorOperation.SyncConnection> = ConnectorOperation.SyncConnection.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection: connectionRef }) {
      const connectionTarget = connectionRef.target;
      const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
      if (!db) {
        return { synced: 0 };
      }

      const connection = yield* Database.load(connectionRef).pipe(Effect.provide(Database.layer(db)));
      const connectors = (yield* Capability.getAll(Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection.connectorId);
      if (!connector?.sync) {
        return { synced: 0 };
      }

      const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run.pipe(
        Effect.provide(Database.layer(db)),
        Effect.map((results) =>
          results.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection)),
        ),
        Effect.orElseSucceed((): Cursor.ExternalCursor[] => []),
      );

      const spaceId = db.spaceId;
      // Serialized invocation the reauth toast runs on click — data (operation key + input), not a live
      // callback, since it rides on the error across the process boundary.
      const openConnection = Operation.prepare(LayoutOperation.Open, {
        subject: [connectionDeckSubject(GraphPath.getSpacePath(spaceId), connection.id)],
        navigation: 'immediate',
      });

      yield* Effect.all(
        cursors.map((cursor) =>
          syncBinding({ connector, cursor, spaceId }).pipe(
            Effect.provide(Database.layer(db)),
            // `Process.fromOperation` promotes any handler failure to a defect (`Effect.orDie`), so
            // retagging 401s must intercept the defect channel — `Effect.mapError` never sees it.
            // TODO(wittjosiah): Only reaches a directly-invoked sync; a triggered run reports through
            //   the dispatcher's own process, so its 401s show a generic failure instead of this prompt.
            Effect.catchAllDefect((defect) =>
              RunAgainError.is(defect)
                ? Effect.void
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
          ),
        ),
        // Bounded: a connection can have many bindings, and syncing them all at once would hit the
        // provider with a burst of requests per manual sync.
        { concurrency: SYNC_CONCURRENCY },
      );

      return { synced: cursors.length };
    }),
  ),
);

export default handler;
