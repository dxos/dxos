//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as RemoteTriggerManager from './RemoteTriggerManager';

describe('RemoteTriggerManager', () => {
  test('layerNoop yields no triggers', async ({ expect }) => {
    const registry = Registry.make();
    const program = Effect.gen(function* () {
      const manager = yield* RemoteTriggerManager.Service;
      return registry.get(manager.triggers);
    });
    const result = await EffectEx.runPromise(
      program.pipe(
        Effect.provide(RemoteTriggerManager.layerNoop),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, registry)),
      ),
    );
    expect(result).toEqual([]);
  });
});
