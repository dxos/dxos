//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Space, SpaceState } from '@dxos/client/echo';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

import { ClientCapabilities } from '#types';

import { type MonitorUpdate, createSpaceReplicationProgressKey, toSpaceUpdate } from '../progress';

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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const monitor of monitors.values()) {
          monitor.remove();
        }
        monitors.clear();
      }),
    );

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
      monitor.note(update.note ?? '');
    };

    // A space that has not finished initializing throws from its `properties` getter, and the
    // spaces subscription fires before initialization completes (startup, space creation) — so
    // the name is read lazily per sync-state update, and only once the space is SPACE_READY.
    const getSpaceName = (space: Space): string | undefined =>
      space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined;

    // The spaces subscription re-delivers the whole list on every change, so subscribing blindly
    // would stack a fiber per space per delivery — duplicate writers then race over one monitor key.
    const subscribed = new Set<SpaceId>();
    const runtime = yield* Effect.context<Scope.Scope>();
    const subscribeSpace = (space: Space): void => {
      if (subscribed.has(space.id)) {
        return;
      }
      subscribed.add(space.id);

      void Effect.gen(function* () {
        const key = createSpaceReplicationProgressKey(space.id);
        const apply = (state: Database.SyncState) => applyMonitor(key, toSpaceUpdate(getSpaceName(space), state));
        const provide = ServiceResolver.provide({ space: space.id }, Database.Service);

        const streamFiber = processManagerRuntime.runFork(
          Database.subscribeToSyncState().pipe(
            Stream.runForEach((state) => Effect.sync(() => apply(state))),
            Effect.provide(provide),
          ),
        );
        const reconcileFiber = processManagerRuntime.runFork(
          Database.getSyncState().pipe(
            Effect.map(apply),
            Effect.repeat(Schedule.spaced(RECONCILE_INTERVAL)),
            Effect.provide(provide),
          ),
        );

        yield* Effect.addFinalizer(() =>
          Effect.all([Fiber.interrupt(streamFiber), Fiber.interrupt(reconcileFiber)], { discard: true }),
        );
      }).pipe(Effect.provide(runtime), Effect.runFork);
    };

    // A space that leaves the list (closed, left) never emits another sync state, so its monitor
    // would linger forever — drop it here instead.
    const pruneMonitors = (spaces: readonly Space[]): void => {
      const live = new Set(spaces.map((space) => createSpaceReplicationProgressKey(space.id)));
      for (const key of [...monitors.keys()]) {
        if (!live.has(key)) {
          applyMonitor(key, undefined);
        }
      }
    };

    const spacesSubscription = client.spaces.subscribe((spaces) => {
      for (const space of spaces) {
        subscribeSpace(space);
      }
      pruneMonitors(spaces);
    });
    yield* Effect.addFinalizer(() => Effect.sync(() => spacesSubscription.unsubscribe()));
    for (const space of client.spaces.get()) {
      subscribeSpace(space);
    }

    return [];
  }),
);
