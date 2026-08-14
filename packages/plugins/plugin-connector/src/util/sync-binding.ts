//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, type Key, Obj, Ref } from '@dxos/echo';
import { type Cursor } from '@dxos/link';

import { ConnectorSpec } from '#types';

import { ConnectionSyncError } from '../errors';
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
  connector: ConnectorSpec.ConnectorEntry;
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

    if (sync.remote) {
      // EDGE dispatches a remote trigger by resolving it through an index query, so a trigger created
      // moments ago (the first sync of a new connection) is reported as "not found" unless EDGE has
      // both replicated and indexed it first (DX-1153).
      yield* Database.sync({ to: 'edge', entities: [Obj.getURI(trigger)], indexed: true });
    }

    yield* fireSyncTrigger(trigger).pipe(Effect.provide(syncTriggerMonitorLayer(spaceId)));
  }).pipe(
    // A missing sync handler or an unresolvable trigger monitor both mean the sync never started;
    // the connector is the only context a caller can act on.
    Effect.mapError((cause) => new ConnectionSyncError({ connectorId: connector.id, cause })),
  );
