//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, RunAgainError, type Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { connectionDeckSubject } from '../constants';
import { ConnectionAuthExpiredError, isUnauthorizedError } from '../errors';
import { Connector, ConnectorOperation } from '../types';
import { findSyncTriggerForBinding, fireSyncTrigger, isCursorForConnection, syncTriggerMonitorLayer } from '../util';

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
        Effect.map((results) =>
          results.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection)),
        ),
        Effect.orElseSucceed((): Cursor.ExternalCursor[] => []),
      );

      const sync = connector.sync;
      const spaceId = db.spaceId;
      // Serialized invocation the reauth toast runs on click — data (operation key + input), not a live
      // callback, since it rides on the error across the process boundary.
      const openConnection = Operation.prepare(LayoutOperation.Open, {
        subject: [connectionDeckSubject(GraphPath.getSpacePath(spaceId), connection.id)],
        navigation: 'immediate',
      });

      /**
       * Invokes the connector's sync for one cursor. Used for a cursor with no sync Routine (a
       * targetless connector, or a binding created before routines existed) and as the fallback where
       * no trigger monitor exists (CLI, workerd). Unlike the trigger path this returns the sync's own
       * failure, so a 401 can be retagged for the reauthentication toast.
       */
      const syncDirectly = (cursor: Cursor.ExternalCursor) =>
        Operation.invoke(sync, { binding: Ref.make(cursor) }, { spaceId }).pipe(
          // `Process.fromOperation` promotes any handler failure to a defect (`Effect.orDie`), so
          // retagging 401s must intercept the defect channel — `Effect.mapError` never sees it.
          // TODO(wittjosiah): Invokes the sync once; does not drive `Operation.runAgain()` continuation,
          //   so a capped run's remaining batches are not synced here (no durable execution).
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
        );

      /**
       * Force-runs the cursor's sync Routine, keeping a manual sync on the same path as the scheduled
       * one: the dispatcher drives `Operation.runAgain()`, so a capped run continues through its
       * remaining batches. Falls back to a direct invocation when the space has no trigger monitor.
       *
       * TODO(wittjosiah): The dispatcher reports failures through the run's own process, so a 401
       *   raised here surfaces as a generic sync failure rather than the reauthentication toast
       *   `syncDirectly` produces.
       */
      const syncViaTrigger = (cursor: Cursor.ExternalCursor, trigger: Trigger.Trigger) =>
        fireSyncTrigger(trigger).pipe(
          Effect.provide(syncTriggerMonitorLayer(spaceId)),
          Effect.catchAllCause((cause) =>
            Effect.sync(() => log.warn('sync trigger unavailable, syncing directly', { cause })).pipe(
              Effect.andThen(syncDirectly(cursor)),
            ),
          ),
        );

      yield* Effect.all(
        cursors.map((cursor) =>
          findSyncTriggerForBinding(cursor).pipe(
            Effect.provide(Database.layer(db)),
            Effect.orElseSucceed(() => undefined),
            Effect.flatMap((trigger) => (trigger ? syncViaTrigger(cursor, trigger) : syncDirectly(cursor))),
          ),
        ),
        { concurrency: 'unbounded' },
      );

      return { synced: cursors.length };
    }),
  ),
);

export default handler;
