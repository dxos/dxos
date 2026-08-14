//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { Connection } from '@dxos/link';

import { ConnectorSpec } from '#types';

import { ConnectionSyncError } from '../errors';
import { findBindingForTarget } from './find-binding';
import { syncConnectionOrOfferRoutine } from './run-sync';
import { findSyncTriggerForBinding, fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Syncs a single sync target (a Mailbox, Calendar, …) by way of its binding's connection: the
 * account's sync routine runs with the pressed binding as `priority`, so this target syncs first
 * while its siblings queue behind it. A legacy per-binding sync routine (pre-account-routine spaces)
 * is force-run directly instead. No-op for an object that is not bound to a connection.
 *
 * When the account's sync routine is missing (deleted, or declined at creation), the seeded
 * create-routine form opens instead and saving re-runs the sync — see
 * {@link syncConnectionOrOfferRoutine}.
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

      yield* syncConnectionOrOfferRoutine({ connection, connector, db, priority: cursor.id, subject: target });
    }).pipe(
      Effect.provide(Database.layer(db)),
      // Resolving the binding and its connector can fail the same way the sync itself can, so the
      // caller sees one error type either way.
      Effect.mapError((error) =>
        error instanceof ConnectionSyncError ? error : new ConnectionSyncError({ cause: error }),
      ),
    );
  });
