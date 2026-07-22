//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, test, vi } from 'vitest';

import { RemoteProcessManager } from '@dxos/compute-runtime';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

import * as EdgeProcessManager from './EdgeProcessManager';

describe('EdgeProcessManager', () => {
  test('cancel force-cancels the trigger run on the edge client', async () => {
    const edgeClient = new EdgeHttpClient('https://edge.example.com');
    const cancelSpy = vi.spyOn(edgeClient, 'cancelTriggerRun').mockResolvedValue(undefined);
    const space = SpaceId.random();
    const trigger = 'TRIGGER1';

    const program = Effect.gen(function* () {
      const manager = yield* RemoteProcessManager.Service;
      invariant(manager.cancel, 'edge process manager exposes cancel');
      yield* manager.cancel({ space, trigger });
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(EdgeProcessManager.fromEdgeClient(edgeClient)),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
      ),
    );

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy.mock.calls[0]?.[1]).toBe(space);
    expect(cancelSpy.mock.calls[0]?.[2]).toBe(trigger);
  });

  test('layer without a client omits cancel and yields an empty tree', async () => {
    const program = Effect.gen(function* () {
      const manager = yield* RemoteProcessManager.Service;
      return { hasCancel: manager.cancel !== undefined, tree: yield* manager.processTree };
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(EdgeProcessManager.layer),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
      ),
    );

    expect(result.hasCancel).toBe(false);
    expect(result.tree).toEqual([]);
  });
});
