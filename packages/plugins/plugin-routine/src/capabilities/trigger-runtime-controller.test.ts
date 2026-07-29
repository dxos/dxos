//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ServiceResolver } from '@dxos/compute';
import { TriggerDispatcher } from '@dxos/compute-runtime';
import { Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { SpaceId } from '@dxos/keys';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { RoutinePlugin } from '#plugin';

/**
 * Resolve the per-space {@link TriggerDispatcher} from the harness'
 * process-manager runtime. The `LayerStack` caches dispatchers per
 * `{ space }` context, so the returned instance is the same one the
 * controller is driving.
 */
const getDispatcher = (harness: Awaited<ReturnType<typeof createComposerTestApp>>, spaceId: SpaceId) =>
  harness.runPromise(
    Effect.flatMap(TriggerDispatcher, Effect.succeed).pipe(
      Effect.provide(ServiceResolver.provide({ space: spaceId }, TriggerDispatcher)),
    ),
  );

describe('TriggerRuntimeController', () => {
  test('toggles the per-space TriggerDispatcher as triggersDisabled changes', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({ types: [Feed.Feed] }), RoutinePlugin()],
    });

    // Creating identity also creates the personal space and emits SpacesReady,
    // which is what gates the TriggerRuntimeController module's activation.
    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const dispatcher = await getDispatcher(harness, personalSpace.id);

    // Observe the dispatcher's `state` atom (the same surface the UI hook
    // exposes through `useTriggerRuntimeControls`).
    const observedStates: boolean[] = [];
    const unsubscribe = harness.registry.subscribe(dispatcher.state, (state) => observedStates.push(state.enabled), {
      immediate: true,
    });
    try {
      // `triggersDisabled` is unset by default, so the controller should
      // start the dispatcher shortly after the space becomes ready.
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

      // `triggersDisabled = true` → dispatcher should stop.
      Obj.update(personalSpace.properties, (properties) => {
        properties.triggersDisabled = true;
      });
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(false);

      // Back to enabled → dispatcher should start again.
      Obj.update(personalSpace.properties, (properties) => {
        properties.triggersDisabled = false;
      });
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

      // The atom subscription should have witnessed every transition.
      expect(observedStates).toEqual(expect.arrayContaining([true, false, true]));
    } finally {
      unsubscribe();
    }
  });

  test('does not re-issue start when triggersDisabled is reasserted to the same value', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({ types: [Feed.Feed] }), RoutinePlugin()],
    });

    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const dispatcher = await getDispatcher(harness, personalSpace.id);

    await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

    // Writing the same enabled state should be a no-op: the controller
    // dedupes via its `lastDisabled` tracker so the dispatcher stays
    // running without an intervening stop/start flicker.
    Obj.update(personalSpace.properties, (properties) => {
      properties.triggersDisabled = false;
    });
    // Give any spurious transition a chance to land before we check.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(harness.registry.get(dispatcher.state).enabled).toBe(true);
  });
});
