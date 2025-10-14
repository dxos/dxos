//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestLayer } from '../testing';

import { ClientService } from './client-service';

Test.describe('ClientService', () => {
  Test.it('should initialize', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService;
      return client;
    }).pipe(Effect.provide(TestLayer));
    const client = await Effect.runPromise(program);
    Test.expect(client).toBeDefined();
  });

  Test.it('can create identity', async () => {
    const program = Effect.gen(function* () {
      const client = yield* ClientService;
      const identity = yield* Effect.tryPromise({
        try: () => client.halo.createIdentity(),
        catch: (error) => error as Error,
      });
      return identity;
    }).pipe(Effect.provide(TestLayer));
    const identity = await Effect.runPromise(program);
    Test.expect(identity).toBeDefined();
  });
});
