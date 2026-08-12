//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { RunAgainError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Database, type Key, Obj, Ref, Type } from '@dxos/echo';
import { type Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { SpaceOperation } from '@dxos/plugin-space';

import { ConnectionSyncError, SyncRoutineMissingError } from '../errors';
import { SyncTemplateId } from '../templates/sync';
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
 * seeded form (see {@link syncConnectionOrOfferRoutine}). A connector with no trigger spec syncs on
 * demand only: its sync operation is invoked directly, accepting that a capped run's remaining
 * batches wait (nothing drives continuation outside the dispatcher).
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
      return yield* Operation.invoke(sync.operation, { connection: Ref.make(connection), priority }, { spaceId }).pipe(
        Effect.asVoid,
        // Continuation is dispatcher-driven; a direct invocation surfaces `runAgain` as a defect.
        // Accept the partial sync — an on-demand connector's next manual sync resumes the cursor.
        Effect.catchDefect((defect) =>
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

/**
 * {@link runConnectionSync} with the sync button's recreation path: when the account's sync routine
 * is missing (deleted, or declined at creation), the seeded create-routine form opens instead —
 * over `subject` (a bound target, or the connection itself) — and saving it re-runs this same sync,
 * through the freshly persisted trigger. Cancelling runs nothing. Shared by every sync affordance:
 * a target's sync button, the connection article, and the connection's nav-tree action.
 */
export const syncConnectionOrOfferRoutine = ({
  connection,
  connector,
  db,
  priority,
  subject,
}: {
  connection: Connection.Connection;
  connector: ConnectorSpec.ConnectorEntry;
  db: Database.Database;
  priority?: string;
  subject?: Obj.Unknown;
}): Effect.Effect<void, ConnectionSyncError, Capability.Service | Operation.Service> =>
  runConnectionSync({ connection, connector, spaceId: db.spaceId, priority }).pipe(
    Effect.catchIf(
      (error): error is SyncRoutineMissingError => error instanceof SyncRoutineMissingError,
      () =>
        Effect.gen(function* () {
          const invoker = yield* Operation.Service;
          const capabilities = yield* Capability.Service;
          yield* invoker.invoke(SpaceOperation.OpenCreateObject, {
            target: db,
            typename: Type.getTypename(Routine.Routine),
            initialFormValues: { templateId: SyncTemplateId, subject: subject ?? connection },
            navigable: false,
            onCreateObject: () => {
              // The dialog's save callback is a plain function; re-enter the Effect world with the
              // services captured above.
              Effect.runFork(
                syncConnectionOrOfferRoutine({ connection, connector, db, priority, subject }).pipe(
                  Effect.provideService(Operation.Service, invoker),
                  Effect.provideService(Capability.Service, capabilities),
                  Effect.catch((error) =>
                    Effect.sync(() => log.warn('sync after routine created failed', { error })),
                  ),
                ),
              );
            },
          });
        }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('offer sync routine failed', { error })))),
    ),
    Effect.provide(Database.layer(db)),
  );
