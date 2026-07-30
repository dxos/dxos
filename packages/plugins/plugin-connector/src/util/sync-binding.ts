//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type NoHandlerError, Operation } from '@dxos/compute';
import { Database, type Key, Ref } from '@dxos/echo';
import { type Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { type ConnectorEntry } from '../types';
import { ensureSyncTrigger } from './sync-routine';
import { fireSyncTrigger, syncTriggerMonitorLayer } from './sync-trigger';

/**
 * Syncs one binding, by whichever path its connector declares.
 *
 * A connector with a `sync.trigger` spec is kept in sync by a Routine, so its binding is synced by
 * force-running that Routine's trigger (creating the Routine if this is the binding's first sync):
 * the dispatcher then drives the run, including `Operation.runAgain()` continuation, so a capped run
 * finishes its remaining batches. A connector without a trigger spec syncs on demand only, so its
 * operation is invoked directly — as is any binding whose space has no trigger monitor, which is the
 * shape outside the app (CLI, workerd).
 */
export const syncBinding = ({
  connector,
  cursor,
  spaceId,
}: {
  connector: ConnectorEntry;
  cursor: Cursor.ExternalCursor;
  spaceId: Key.SpaceId;
}): Effect.Effect<void, NoHandlerError, Database.Service | Operation.Service | Capability.Service> =>
  Effect.gen(function* () {
    const sync = connector.sync;
    if (!sync) {
      return;
    }

    const invokeDirectly = () =>
      Operation.invoke(sync.operation, { binding: Ref.make(cursor) }, { spaceId }).pipe(Effect.asVoid);

    const trigger = yield* ensureSyncTrigger({ connector, cursor });
    if (!trigger) {
      return yield* invokeDirectly();
    }

    yield* fireSyncTrigger(trigger).pipe(
      Effect.provide(syncTriggerMonitorLayer(spaceId)),
      Effect.catchAllCause((cause) =>
        Effect.sync(() => log.warn('sync trigger unavailable, syncing directly', { cause })).pipe(
          Effect.andThen(invokeDirectly()),
        ),
      ),
    );
  });
