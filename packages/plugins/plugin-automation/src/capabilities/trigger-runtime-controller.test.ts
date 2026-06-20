//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ServiceResolver } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TriggerDispatcher } from '@dxos/functions-runtime';
import type { SpaceId } from '@dxos/keys';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AutomationPlugin } from '#plugin';

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
  test('toggles the per-space TriggerDispatcher as computeEnvironment changes', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({ types: [Feed.Feed] }), AutomationPlugin()],
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
      // Default `computeEnvironment` is `local`, so the controller should
      // start the dispatcher shortly after the space becomes ready.
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

      // `disabled` → dispatcher should stop.
      Obj.update(personalSpace.properties, (properties) => {
        properties.computeEnvironment = 'disabled';
      });
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(false);

      // Back to `local` → dispatcher should start again.
      Obj.update(personalSpace.properties, (properties) => {
        properties.computeEnvironment = 'local';
      });
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

      // `edge` → dispatcher should stop (triggers run on the edge instead).
      Obj.update(personalSpace.properties, (properties) => {
        properties.computeEnvironment = 'edge';
      });
      await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(false);

      // The atom subscription should have witnessed every transition.
      expect(observedStates).toEqual(expect.arrayContaining([true, false, true, false]));
    } finally {
      unsubscribe();
    }
  });

  test('does not re-issue start when computeEnvironment is reasserted to the same value', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({ types: [Feed.Feed] }), AutomationPlugin()],
    });

    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const dispatcher = await getDispatcher(harness, personalSpace.id);

    await expect.poll(() => harness.registry.get(dispatcher.state).enabled, { timeout: 5_000 }).toBe(true);

    // Writing the same `local` value should be a no-op: the controller
    // dedupes via its `lastEnvironment` tracker so the dispatcher stays
    // running without an intervening stop/start flicker.
    Obj.update(personalSpace.properties, (properties) => {
      properties.computeEnvironment = 'local';
    });
    // Give any spurious transition a chance to land before we check.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(harness.registry.get(dispatcher.state).enabled).toBe(true);
  });
});
