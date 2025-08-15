//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';

import { ClientService } from './client-service';
import { ConfigService } from './config-service';

describe('ClientService', () => {
  it('should initialize', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService;
      return client;
    }).pipe(Effect.provide(ClientService.layer), Effect.provide(ConfigService.layerMemory));
    const client = await Effect.runPromise(program);
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
    }).pipe(Effect.provide(ClientService.layer), Effect.provide(ConfigService.layerMemory));
    const identity = await Effect.runPromise(program);
    expect(identity).toBeDefined();
  });
});
