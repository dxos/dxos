//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { RunAgainError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import { type Database, type Key, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { ConnectionSyncError, SyncRoutineMissingError } from '../errors';
import * as ConnectorOperation from '../types/ConnectorOperation';
import type * as ConnectorSpec from '../types/ConnectorSpec';
import { findSyncTriggerForConnection, fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Runs a connection's sync, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by the connection's Routine, so the sync is
 * run by force-running that Routine's trigger — the dispatcher is what drives the run, including
 * `Operation.runAgain()` continuation, so a capped run finishes its remaining batches. `priority`
 * (a binding's cursor id) rides on the fire event for pressed-first ordering. Routines are only
 * created through the create-routine form, never silently: when the connection has none (deleted, or
 * declined at creation) this fails with {@link SyncRoutineMissingError} so a UI caller can offer the
 * seeded form (see `syncTarget`). A connector with no trigger spec syncs on demand only:
 * {@link ConnectorOperation.SyncConnection} is invoked directly, accepting that a capped run's
 * remaining batches wait (nothing drives continuation outside the dispatcher).
 */
export const runConnectionSync = ({
  connection,
  connector,
  spaceId,
  priority,
}: {
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry;
  spaceId: Key.SpaceId;
  priority?: string;
}): Effect.Effect<
  void,
  ConnectionSyncError | SyncRoutineMissingError,
  Database.Service | Operation.Service | Capability.Service
> =>
  Effect.gen(function* () {
    const sync = connector.sync;
    if (!sync) {
      return;
    }

    if (!sync.trigger) {
      return yield* Operation.invoke(
        ConnectorOperation.SyncConnection,
        { connection: Ref.make(connection), priority },
        { spaceId },
      ).pipe(
        Effect.asVoid,
        // Continuation is dispatcher-driven; a direct invocation surfaces `runAgain` as a defect.
        // Accept the partial sync — an on-demand connector's next manual sync resumes the cursor.
        Effect.catchAllDefect((defect) =>
          RunAgainError.is(defect)
            ? Effect.sync(() => log.info('sync capped; more on next run', { connectorId: connector.id }))
            : Effect.die(defect),
        ),
      );
    }

    const trigger = yield* findSyncTriggerForConnection(connection);
    if (!trigger) {
      return yield* Effect.fail(new SyncRoutineMissingError({ connectorId: connector.id }));
    }

    yield* fireSyncTrigger(trigger, priority ? { priority } : undefined).pipe(
      Effect.provide(syncTriggerMonitorLayer(spaceId)),
    );
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started;
    // the connector is the only context a caller can act on. The missing-routine signal stays
    // distinct so callers can offer the create-routine form instead of reporting a failure.
    Effect.mapError((cause) =>
      cause instanceof SyncRoutineMissingError ? cause : new ConnectionSyncError({ connectorId: connector.id, cause }),
    ),
  );
