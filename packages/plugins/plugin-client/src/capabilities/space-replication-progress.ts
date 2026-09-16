//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Space, SpaceState } from '@dxos/client/echo';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { ClientCapabilities } from '#types';

import { type MonitorUpdate, createSpaceReplicationProgressKey, toSpaceUpdate } from '../progress/index.ts';

/**
 * Reconciliation interval. The sync-state streams are the primary signal; a periodic re-read
 * guarantees a monitor cannot outlive its backlog if an update is ever missed (a dropped stream,
 * a leader change), which would otherwise leave the indicator spinning forever.
 */
const RECONCILE_INTERVAL = Duration.seconds(10);

/**
 * Publishes per-space replication backlog — automerge documents and ECHO feed blocks combined into a
 * single monitor per space — into the {@link AppCapabilities.ProgressRegistry}. Subscribes to the
 * combined sync-state stream and drops a space's monitor once it catches up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const processManagerRuntime = yield* Capabilities.ProcessManagerRuntime;

    // Optional: a host without a progress registry (e.g. a storybook or an embedding app that omits
    // plugin-progress) loses the meter, not the plugin.
    const registryOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(registryOption)) {
      return [];
    }
    const registry = registryOption.value;

    const monitors = new Map<string, AppCapabilities.ProgressMonitor>();

    const applyMonitor = (key: string, update: MonitorUpdate | undefined): void => {
      if (update === undefined) {
        monitors.get(key)?.remove();
        monitors.delete(key);
        return;
      }

      let monitor = monitors.get(key);
      if (!monitor) {
        monitor = registry.register(key, { label: update.label, total: update.total });
        monitors.set(key, monitor);
      }
      monitor.set(update.current);
      monitor.total(update.total);
      // monitor.note(update.note ?? '');
    };

    // A space that has not finished initializing throws from its `properties` getter, and the
    // spaces subscription fires before initialization completes (startup, space creation) —
    // so the name is read lazily per sync-state update, and only once the space is SPACE_READY.
    const getSpaceName = (space: Space): string | undefined =>
      space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined;

    // The spaces subscription re-delivers the whole list on every change, so subscribing blindly
    // would stack a fiber per space per delivery — duplicate writers then race over one monitor key.
    const subscriptions = new Map<SpaceId, Fiber.Fiber<unknown, unknown>[]>();
    const subscribeSpace = (space: Space): void => {
      if (subscriptions.has(space.id)) {
        return;
      }

      const key = createSpaceReplicationProgressKey(space.id);
      const apply = (state: Database.SyncState) => applyMonitor(key, toSpaceUpdate(getSpaceName(space), state));
      const provide = ServiceResolver.provide({ space: space.id }, Database.Service);

      subscriptions.set(space.id, [
        processManagerRuntime.runFork(
          Database.subscribeToSyncState().pipe(
            Stream.runForEach((state) => Effect.sync(() => apply(state))),
            Effect.catchCause((cause) => reportSyncFailure('sync state stream failed', space.id, cause)),
            Effect.provide(provide),
          ),
        ),
        processManagerRuntime.runFork(
          // Caught inside the loop so a transient read failure cannot kill reconciliation.
          Database.getSyncState().pipe(
            Effect.map(apply),
            Effect.catchCause((cause) => reportSyncFailure('sync state read failed', space.id, cause)),
            Effect.repeat(Schedule.spaced(RECONCILE_INTERVAL)),
            Effect.provide(provide),
          ),
        ),
      ]);
    };

    const unsubscribeSpace = (spaceId: SpaceId): void => {
      const fibers = subscriptions.get(spaceId);
      if (!fibers) {
        return;
      }
      subscriptions.delete(spaceId);
      applyMonitor(createSpaceReplicationProgressKey(spaceId), undefined);
      Effect.runFork(Effect.all(fibers.map(Fiber.interrupt), { discard: true }));
    };

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const spaceId of subscriptions.keys()) {
          unsubscribeSpace(spaceId);
        }
      }),
    );

    // A departed space stops emitting sync state, so its monitor and fibers must be torn down here.
    const pruneSpaces = (spaces: readonly Space[]): void => {
      const live = new Set(spaces.map((space) => space.id));
      for (const spaceId of subscriptions.keys()) {
        if (!live.has(spaceId)) {
          unsubscribeSpace(spaceId);
        }
      }
    };

    const spacesSubscription = client.spaces.subscribe((spaces) => {
      for (const space of spaces) {
        subscribeSpace(space);
      }
      pruneSpaces(spaces);
    });
    yield* Effect.addFinalizer(() => Effect.sync(() => spacesSubscription.unsubscribe()));
    for (const space of client.spaces.get()) {
      subscribeSpace(space);
    }

    return [];
  }),
);

/**
 * Swallows a sync-state failure so the reconciliation loop survives it (a rejected read arrives as a
 * defect via `Effect.promise`); interruption is teardown, not a fault, so it is not reported.
 */
const reportSyncFailure = (message: string, space: SpaceId, cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  Effect.sync(() => {
    if (!Cause.hasInterrupts(cause)) {
      log.warn(message, { space, cause });
    }
  });
