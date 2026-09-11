//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as RemoteProcessManager from './RemoteProcessManager.ts';

describe('RemoteProcessManager', () => {
  test('layerNoop yields an empty process tree', async ({ expect }) => {
    const program = Effect.gen(function* () {
      const manager = yield* RemoteProcessManager.Service;
      return yield* manager.processTree;
    });
    const result = await EffectEx.runPromise(
      program.pipe(
        Effect.provide(RemoteProcessManager.layerNoop),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
      ),
    );
    expect(result).toEqual([]);
  });
});
