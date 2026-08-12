//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { SpaceOperation } from '@dxos/plugin-space';

import { ConnectionSyncError, SyncRoutineMissingError } from '../errors';
import { SyncTemplateId } from '../templates/sync';
import * as ConnectorSpec from '../types/ConnectorSpec';
import { findBindingForTarget } from './find-binding';
import { runConnectionSync } from './run-sync';
import { findSyncTriggerForBinding, fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Syncs a single sync target (a Mailbox, Calendar, …) by way of its binding's connection: the
 * account's sync routine runs with the pressed binding as `priority`, so this target syncs first
 * while its siblings queue behind it. A legacy per-binding sync routine (pre-account-routine spaces)
 * is force-run directly instead. No-op for an object that is not bound to a connection.
 *
 * When the account's sync routine is missing (deleted, or declined at creation), this is the sync
 * button's recreation path: the seeded create-routine form opens instead, and saving it re-runs the
 * sync the user just pressed — through the freshly persisted trigger, so the dispatcher drives
 * continuation. Cancelling runs nothing.
 */
export const syncTarget = (
  target: Obj.Unknown,
): Effect.Effect<void, ConnectionSyncError, Capability.Service | Operation.Service> =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(target);
    if (!db) {
      return;
    }

    yield* Effect.gen(function* () {
      const cursor = yield* findBindingForTarget(target);
      if (!cursor) {
        return;
      }

      // Legacy per-binding routine: fire its trigger as before the account-level model.
      const legacyTrigger = yield* findSyncTriggerForBinding(cursor);
      if (legacyTrigger) {
        return yield* fireSyncTrigger(legacyTrigger).pipe(Effect.provide(syncTriggerMonitorLayer(db.spaceId)));
      }

      const [connection] = yield* Database.query(
        Filter.type(Connection.Connection, { accessToken: cursor.spec.source }),
      ).run;
      const connectors = (yield* Capability.getAll(ConnectorSpec.Connector)).flat();
      const connector = connectors.find((entry) => entry.id === connection?.connectorId);
      if (!connection || !connector) {
        return;
      }

      yield* runConnectionSync({ connection, connector, spaceId: db.spaceId, priority: cursor.id }).pipe(
        Effect.catchIf(
          (error): error is SyncRoutineMissingError => error instanceof SyncRoutineMissingError,
          () => offerSyncRoutine(target, db),
        ),
      );
    }).pipe(
      Effect.provide(Database.layer(db)),
      // Resolving the binding and its connector can fail the same way the sync itself can, so the
      // caller sees one error type either way.
      Effect.mapError((error) =>
        error instanceof ConnectionSyncError ? error : new ConnectionSyncError({ cause: error }),
      ),
    );
  });

/**
 * Reopen the seeded create-routine form for the account's missing sync routine; saving re-runs
 * {@link syncTarget}, which now finds the trigger and fires it with this target as priority.
 */
const offerSyncRoutine = (
  target: Obj.Unknown,
  db: Database.Database,
): Effect.Effect<void, never, Capability.Service | Operation.Service> =>
  Effect.gen(function* () {
    const invoker = yield* Operation.Service;
    const capabilities = yield* Capability.Service;
    yield* invoker.invoke(SpaceOperation.OpenCreateObject, {
      target: db,
      typename: Type.getTypename(Routine.Routine),
      initialFormValues: { templateId: SyncTemplateId, subject: target },
      navigable: false,
      onCreateObject: () => {
        // The dialog's save callback is a plain function; re-enter the Effect world with the
        // services captured above.
        Effect.runFork(
          syncTarget(target).pipe(
            Effect.provideService(Operation.Service, invoker),
            Effect.provideService(Capability.Service, capabilities),
            Effect.catchAll((error) => Effect.sync(() => log.warn('sync after routine created failed', { error }))),
          ),
        );
      },
    });
  }).pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('offer sync routine failed', { error }))));
