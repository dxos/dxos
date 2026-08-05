//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver } from '@dxos/compute';
import { TriggerDispatcher } from '@dxos/compute-runtime';
import { Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Space } from '@dxos/react-client/echo';

//
// Capability Module
//
// Watches `space.properties.triggersDisabled` for every space and toggles
// the per-space {@link TriggerDispatcher} accordingly:
//
//   - disabled (`true`)        → `dispatcher.stop()`
//   - enabled (unset/`false`)  → `dispatcher.start()`
//
// Per-trigger local/edge routing is handled by the trigger's `remote` flag
// (the dispatcher skips remote triggers); this space-wide flag is only the
// kill-switch for local execution. The dispatcher itself is contributed
// unconditionally via `TriggerDispatcherSpec` in `layer-specs.ts`, so this
// capability is only responsible for driving its lifecycle.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const runtime = yield* Capabilities.ProcessManagerRuntime;

    /** Per-space property-subscription unsubscribe, last-seen disabled state, and in-flight transition fiber. */
    type Tracker = {
      unsubscribe: () => void;
      lastDisabled?: boolean;
      inFlight?: Fiber.RuntimeFiber<unknown, unknown>;
    };
    const trackers = new Map<SpaceId, Tracker>();

    /**
     * Resolve the per-space `TriggerDispatcher` from the process-manager
     * runtime and invoke `start()` / `stop()` according to the requested
     * disabled state. Returns a fiber so the caller can cancel a pending
     * transition when a new one supersedes it.
     */
    const transition = (spaceId: SpaceId, disabled: boolean) =>
      runtime.runFork(
        Effect.gen(function* () {
          const dispatcher = yield* TriggerDispatcher;
          yield* disabled ? dispatcher.stop() : dispatcher.start();
        }).pipe(
          Effect.provide(ServiceResolver.provide({ space: spaceId }, TriggerDispatcher)),
          Effect.tapErrorCause((cause) =>
            Effect.sync(() => log.warn('trigger dispatcher transition failed', { spaceId, disabled, cause })),
          ),
        ),
      );

    const apply = (tracker: Tracker, spaceId: SpaceId, disabled: boolean): void => {
      if (tracker.lastDisabled === disabled) {
        return;
      }
      tracker.lastDisabled = disabled;
      if (tracker.inFlight) {
        runtime.runFork(Fiber.interrupt(tracker.inFlight));
      }
      tracker.inFlight = transition(spaceId, disabled);
    };

    const install = (space: Space): void => {
      if (trackers.has(space.id)) {
        return;
      }
      // Reserve the slot synchronously so concurrent `client.spaces.subscribe`
      // notifications (e.g. spaces array churn while we await readiness) don't
      // wire a second subscriber for the same space.
      const tracker: Tracker = { unsubscribe: () => {} };
      trackers.set(space.id, tracker);

      void space
        .waitUntilReady()
        .then(() => {
          // The capability could have been torn down between `set` and the
          // promise resolving; bail out without subscribing in that case.
          if (trackers.get(space.id) !== tracker) {
            return;
          }
          const readDisabled = (): boolean => space.properties.triggersDisabled ?? false;
          tracker.unsubscribe = Obj.subscribe(space.properties, () => apply(tracker, space.id, readDisabled()));
          apply(tracker, space.id, readDisabled());
        })
        .catch((err) => log.catch(err));
    };

    const installAll = (spaces: readonly Space[]): void => {
      for (const space of spaces) {
        install(space);
      }
    };

    const spacesSubscription = client.spaces.subscribe(installAll);
    installAll(client.spaces.get());

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        spacesSubscription.unsubscribe();
        for (const tracker of trackers.values()) {
          tracker.unsubscribe();
          if (tracker.inFlight) {
            runtime.runFork(Fiber.interrupt(tracker.inFlight));
          }
        }
        trackers.clear();
      }),
    );

    return [];
  }),
);
