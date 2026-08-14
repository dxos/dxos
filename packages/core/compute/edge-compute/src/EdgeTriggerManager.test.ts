//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { vi } from 'vitest';

import { RemoteTriggerManager } from '@dxos/compute-runtime';
import * as Trigger from '@dxos/compute/Trigger';
import { EdgeHttpClient } from '@dxos/edge-client';
import { SpaceId } from '@dxos/keys';
import { EdgeCallFailedError } from '@dxos/protocols';

import * as EdgeTriggerManager from './EdgeTriggerManager';

const SPACE_ID = SpaceId.random();

describe('EdgeTriggerManager', () => {
  it.effect('retries a force-run that races the trigger replicating to edge', () =>
    Effect.gen(function* () {
      const edgeClient = new EdgeHttpClient('https://edge.example.com');
      vi.spyOn(edgeClient, 'getSpaceTriggers').mockResolvedValue({ isActive: true, triggers: [] });
      // The trigger becomes known to edge after two rejections.
      const forceRun = vi
        .spyOn(edgeClient, 'forceRunCronTrigger')
        .mockRejectedValueOnce(notReplicatedError())
        .mockRejectedValueOnce(notReplicatedError())
        .mockResolvedValue(undefined);

      const fiber = yield* forkInvoke(edgeClient);
      // Backoff is 1s then 2s; advance past both so the third attempt lands.
      yield* TestClock.adjust('5 seconds');

      expect(Exit.isSuccess(yield* Effect.exit(Fiber.join(fiber)))).toBe(true);
      expect(forceRun).toHaveBeenCalledTimes(3);
    }),
  );

  it.effect('retries a force-run rejected while the identity is not yet known to edge', () =>
    Effect.gen(function* () {
      const edgeClient = new EdgeHttpClient('https://edge.example.com');
      vi.spyOn(edgeClient, 'getSpaceTriggers').mockResolvedValue({ isActive: true, triggers: [] });
      const forceRun = vi
        .spyOn(edgeClient, 'forceRunCronTrigger')
        .mockRejectedValueOnce(identityNotAssociatedError())
        .mockResolvedValue(undefined);

      const fiber = yield* forkInvoke(edgeClient);
      yield* TestClock.adjust('5 seconds');

      expect(Exit.isSuccess(yield* Effect.exit(Fiber.join(fiber)))).toBe(true);
      expect(forceRun).toHaveBeenCalledTimes(2);
    }),
  );

  it.effect('gives up once the backoff is exhausted', () =>
    Effect.gen(function* () {
      const edgeClient = new EdgeHttpClient('https://edge.example.com');
      vi.spyOn(edgeClient, 'getSpaceTriggers').mockResolvedValue({ isActive: true, triggers: [] });
      const forceRun = vi
        .spyOn(edgeClient, 'forceRunCronTrigger')
        .mockRejectedValue(new EdgeCallFailedError({ message: 'HTTP code 500: Internal Server Error.' }));

      const fiber = yield* forkInvoke(edgeClient);
      yield* TestClock.adjust('120 seconds');

      expect(Exit.isFailure(yield* Effect.exit(Fiber.join(fiber)))).toBe(true);
      // The initial attempt plus the five scheduled retries.
      expect(forceRun).toHaveBeenCalledTimes(6);
    }),
  );
});

const notReplicatedError = () => new EdgeCallFailedError({ message: 'HTTP code 404: Not Found.' });

const identityNotAssociatedError = () =>
  new EdgeCallFailedError({
    message: 'Identity is not associated with an account.',
    data: { type: 'identity_not_associated_with_account' },
  });

/**
 * Force-runs a trigger through a manager backed by `edgeClient`, on a forked fiber so the caller
 * can advance the `TestClock` across the retry backoff.
 */
const forkInvoke = (edgeClient: EdgeHttpClient) =>
  Effect.gen(function* () {
    const manager = yield* RemoteTriggerManager.Service;
    const trigger = Trigger.make({ enabled: true, remote: true, spec: Trigger.specTimer('*/5 * * * *') });
    yield* manager.invokeTrigger({ trigger, event: { tick: 0 } });
  }).pipe(
    Effect.provide(EdgeTriggerManager.fromEdgeClient(edgeClient, SPACE_ID)),
    Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
    Effect.forkChild,
  );
