//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import { ConfigService } from '@dxos/config';

import { ClientService } from './client-service';

const TestLayer = Function.pipe(ClientService.layer, Layer.provideMerge(ConfigService.layerMemory));

describe('ClientService', () => {
  it('should initialize', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService;
      return client;
    }).pipe(Effect.provide(TestLayer));
    const client = await runAndForwardErrors(program);
    expect(client).toBeDefined();
  });

  it('can create identity', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService;
      const identity = yield* Effect.tryPromise({
        try: () => client.halo.createIdentity(),
        catch: (error) => error as Error,
      });
      return identity;
    }).pipe(Effect.provide(TestLayer));
    const identity = await runAndForwardErrors(program);
    expect(identity).toBeDefined();
  });
});
