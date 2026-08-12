//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { RunAgainError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { connectionDeckSubject } from '../constants';
import { ConnectionAuthExpiredError, isUnauthorizedError } from '../errors';
import * as ConnectorOperation from '../types/ConnectorOperation';
import * as ConnectorSpec from '../types/ConnectorSpec';
import { isCursorForConnection } from '../util';

/** How many of a connection's bindings sync at once. */
const SYNC_CONCURRENCY = 2;

const handler: Operation.WithHandler<typeof ConnectorOperation.SyncConnection> = ConnectorOperation.SyncConnection.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection: connectionRef, priority }) {
      const connectionTarget = connectionRef.target;
      const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
      if (!db) {
        return { synced: 0 };
      }

      const connection = yield* Database.load(connectionRef).pipe(Effect.provide(Database.layer(db)));
      const connectors = (yield* Capability.getAll(ConnectorSpec.Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection.connectorId);
      const sync = connector?.sync;
      if (!sync) {
        return { synced: 0 };
      }

      const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run.pipe(
        Effect.provide(Database.layer(db)),
        Effect.map((results) =>
          results.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection)),
        ),
        Effect.orElseSucceed((): Cursor.ExternalCursor[] => []),
      );

      // Pressed-first ordering: a manual sync from one target's button carries its binding as
      // `priority`, so that cursor grabs a fan-out slot immediately while its siblings queue.
      const ordered = priority ? [...cursors].sort((a, b) => rank(a, priority) - rank(b, priority)) : cursors;

      const spaceId = db.spaceId;
      // Serialized invocation the reauth toast runs on click — data (operation key + input), not a live
      // callback, since it rides on the error across the process boundary.
      const openConnection = Operation.prepare(LayoutOperation.Open, {
        subject: [connectionDeckSubject(GraphPath.getSpacePath(spaceId), connection.id)],
        navigation: 'immediate',
      });

      // Whether any binding requested continuation (`Operation.runAgain`) — re-raised once at the
      // end, after every binding had its turn, so a single capped binding never starves the rest.
      let wantsRerun = false;

      yield* Effect.all(
        ordered.map((cursor) =>
          Operation.invoke(sync.operation, { binding: Ref.make(cursor) }, { spaceId }).pipe(
            Effect.asVoid,
            Effect.provide(Database.layer(db)),
            // `Process.fromOperation` promotes any handler failure to a defect (`Effect.orDie`), so
            // retagging 401s must intercept the defect channel — `Effect.mapError` never sees it.
            // TODO(wittjosiah): Only reaches a directly-invoked sync; a triggered run reports through
            //   the dispatcher's own process, so its 401s show a generic failure instead of this prompt.
            Effect.catchAllDefect((defect) =>
              RunAgainError.is(defect)
                ? Effect.sync(() => {
                    wantsRerun = true;
                  })
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

      // Re-raise continuation at the operation level: a dispatcher-driven run (the connection
      // routine's trigger) re-invokes this operation with the same event — pressed-first ordering
      // included — and the durable per-binding cursors resume where they left off. A direct caller
      // must tolerate the defect (see `runConnectionSync`).
      if (wantsRerun) {
        return yield* Operation.runAgain();
      }

      return { synced: cursors.length };
    }),
  ),
);

export default handler;

/** Priority cursor first; otherwise keep query order. */
const rank = (cursor: Cursor.ExternalCursor, priority: string): number => (cursor.id === priority ? 0 : 1);
