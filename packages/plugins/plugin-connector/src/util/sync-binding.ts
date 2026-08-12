//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, type Key, Ref } from '@dxos/echo';
import { type Cursor } from '@dxos/link';

import { ConnectionSyncError, SyncRoutineMissingError } from '../errors';
import type * as ConnectorSpec from '../types/ConnectorSpec';
import { findSyncTriggerForBinding, fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Syncs one binding, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by a Routine, so its binding is always
 * synced by force-running that Routine's trigger — the dispatcher is what drives the run, including
 * `Operation.runAgain()` continuation, so a capped run finishes its remaining batches. Routines are
 * only created through the create-routine form, never silently: when the binding has none (deleted,
 * or declined at creation) this fails with {@link SyncRoutineMissingError} so a UI caller can offer
 * the seeded form (see `syncTarget`). A connector with no trigger spec syncs on demand only, and its
 * operation is invoked directly.
 */
export const syncBinding = ({
  connector,
  cursor,
  spaceId,
}: {
  connector: ConnectorSpec.ConnectorEntry;
  cursor: Cursor.ExternalCursor;
  spaceId: Key.SpaceId;
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
      // TODO(wittjosiah): Invokes the sync once; nothing drives `Operation.runAgain()` continuation
      //   without a trigger, so a capped run's remaining batches are not synced here.
      return yield* Operation.invoke(sync.operation, { binding: Ref.make(cursor) }, { spaceId }).pipe(Effect.asVoid);
    }

    const trigger = yield* findSyncTriggerForBinding(cursor);
    if (!trigger) {
      return yield* Effect.fail(new SyncRoutineMissingError({ connectorId: connector.id }));
    }

    yield* fireSyncTrigger(trigger).pipe(Effect.provide(syncTriggerMonitorLayer(spaceId)));
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started;
    // the connector is the only context a caller can act on. The missing-routine signal stays
    // distinct so callers can offer the create-routine form instead of reporting a failure.
    Effect.mapError((cause) =>
      cause instanceof SyncRoutineMissingError ? cause : new ConnectionSyncError({ connectorId: connector.id, cause }),
    ),
  );
