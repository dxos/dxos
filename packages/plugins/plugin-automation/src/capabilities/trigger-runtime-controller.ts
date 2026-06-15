//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type ComputeEnvironment } from '@dxos/client-protocol';
import { ServiceResolver } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { TriggerDispatcher } from '@dxos/functions-runtime';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Space } from '@dxos/react-client/echo';

//
// Capability Module
//
// Watches `space.properties.computeEnvironment` for every space and toggles
// the per-space {@link TriggerDispatcher} accordingly:
//
//   - `local`              → `dispatcher.start()`
//   - `edge` / `disabled`  → `dispatcher.stop()`
//
// Replaces the in-line watcher that used to live inside the removed
// `compute-runtime.ts` per-space layer. The dispatcher itself is now
// contributed unconditionally via `TriggerDispatcherSpec` in `layer-specs.ts`,
// so this capability is only responsible for driving its lifecycle.
//

/** Trigger execution location the dispatcher should run locally. */
const LOCAL_ENVIRONMENT: ComputeEnvironment = 'local';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const runtime = yield* Capability.get(Capabilities.ProcessManagerRuntime);

    /** Per-space property-subscription unsubscribe, last-seen environment, and in-flight transition fiber. */
    type Tracker = {
      unsubscribe: () => void;
      lastEnvironment?: ComputeEnvironment;
      inFlight?: Fiber.RuntimeFiber<unknown, unknown>;
    };
    const trackers = new Map<SpaceId, Tracker>();

    /**
     * Resolve the per-space `TriggerDispatcher` from the process-manager
     * runtime and invoke `start()` / `stop()` according to the requested
     * environment. Returns a fiber so the caller can cancel a pending
     * transition when a new one supersedes it.
     */
    const transition = (spaceId: SpaceId, environment: ComputeEnvironment) =>
      runtime.runFork(
        Effect.gen(function* () {
          const dispatcher = yield* TriggerDispatcher;
          yield* environment === LOCAL_ENVIRONMENT ? dispatcher.start() : dispatcher.stop();
        }).pipe(
          Effect.provide(ServiceResolver.provide({ space: spaceId }, TriggerDispatcher)),
          Effect.tapErrorCause((cause) =>
            Effect.sync(() => log.warn('trigger dispatcher transition failed', { spaceId, environment, cause })),
          ),
        ),
      );

    const apply = (tracker: Tracker, spaceId: SpaceId, environment: ComputeEnvironment): void => {
      if (tracker.lastEnvironment === environment) {
        return;
      }
      tracker.lastEnvironment = environment;
      if (tracker.inFlight) {
        runtime.runFork(Fiber.interrupt(tracker.inFlight));
      }
      tracker.inFlight = transition(spaceId, environment);
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
          const readEnvironment = (): ComputeEnvironment => space.properties.computeEnvironment ?? LOCAL_ENVIRONMENT;
          // Side-effecting subscriber (installs/tears down triggers): `latestOnly` so it never fires
          // on time-travel scrubbing and always reads the latest committed environment.
          tracker.unsubscribe = Obj.subscribe(space.properties, () => apply(tracker, space.id, readEnvironment()), {
            latestOnly: true,
          });
          apply(tracker, space.id, readEnvironment());
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

    return Capability.contributes(Capabilities.Null, null, () =>
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
  }),
);
