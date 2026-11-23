//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import { layerMemory } from '@dxos/config';
import * as EffectEx from '@dxos/effect/EffectEx';

import { ClientService, layer, layerLazy } from './client-service.ts';

const TestLayer = Function.pipe(layer, Layer.provideMerge(layerMemory));

describe('ClientService', () => {
  it('should initialize', { timeout: 10_000 }, async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService.client;
      return client;
    }).pipe(Effect.provide(TestLayer));
    const client = await EffectEx.runAndForwardErrors(program);
    expect(client).toBeDefined();
  });

  it('can create identity', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService.client;
      const identity = yield* Effect.tryPromise(() => client.halo.createIdentity());
      return identity;
    }).pipe(Effect.provide(TestLayer));
    const identity = await EffectEx.runAndForwardErrors(program);
    expect(identity).toBeDefined();
  });

  it('layerLazy initializes the client only on first use, once', { timeout: 10_000 }, async () => {
    const program = Effect.gen(function* () {
      const handle = yield* ClientService;
      const [first, second] = yield* Effect.all([handle.client, handle.client], { concurrency: 'unbounded' });
      // Checked inside the scope: closing it destroys the client.
      expect(first).toBe(second);
      expect(first.initialized).toBe(true);
    }).pipe(Effect.provide(Function.pipe(layerLazy, Layer.provideMerge(layerMemory))));
    await EffectEx.runAndForwardErrors(program);
  });

  it('layerLazy does not initialize a client nothing uses', async () => {
    const program = Effect.gen(function* () {
      yield* ClientService;
      return 'done';
    }).pipe(Effect.provide(Function.pipe(layerLazy, Layer.provideMerge(layerMemory))));
    expect(await EffectEx.runAndForwardErrors(program)).toBe('done');
  });
});
