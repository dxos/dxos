//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as Operation from '@dxos/compute/Operation';
import { Database, type Key, Ref } from '@dxos/echo';
import { type Cursor } from '@dxos/link';

import { ConnectionSyncError } from '../errors';
import { type ConnectorEntry } from '../types';
import { ensureSyncTrigger } from './sync-routine';
import { fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Syncs one binding, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by a Routine, so its binding is always
 * synced by force-running that Routine's trigger — creating the Routine first when the binding has
 * none yet — because the dispatcher is what drives the run, including `Operation.runAgain()`
 * continuation, so a capped run finishes its remaining batches. A connector with no trigger spec
 * syncs on demand only, and its operation is invoked directly.
 */
export const syncBinding = ({
  connector,
  cursor,
  spaceId,
}: {
  connector: ConnectorEntry;
  cursor: Cursor.ExternalCursor;
  spaceId: Key.SpaceId;
}): Effect.Effect<void, ConnectionSyncError, Database.Service | Operation.Service | Capability.Service> =>
  Effect.gen(function* () {
    const sync = connector.sync;
    if (!sync) {
      return;
    }

    const trigger = yield* ensureSyncTrigger({ connector, cursor });
    if (!trigger) {
      // TODO(wittjosiah): Invokes the sync once; nothing drives `Operation.runAgain()` continuation
      //   without a trigger, so a capped run's remaining batches are not synced here.
      return yield* Operation.invoke(sync.operation, { binding: Ref.make(cursor) }, { spaceId }).pipe(Effect.asVoid);
    }

    yield* fireSyncTrigger(trigger).pipe(Effect.provide(syncTriggerMonitorLayer(spaceId)));
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started;
    // the connector is the only context a caller can act on.
    Effect.mapError((cause) => new ConnectionSyncError({ connectorId: connector.id, cause })),
  );
