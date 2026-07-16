//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as RemoteProcessManager from './RemoteProcessManager';

describe('RemoteProcessManager', () => {
  test('layerNoop yields an empty process tree', async ({ expect }) => {
    const program = Effect.gen(function* () {
      const manager = yield* RemoteProcessManager.Service;
      return yield* manager.processTree;
    });
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(RemoteProcessManager.layerNoop),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
      ),
    );
    expect(result).toEqual([]);
  });
});
