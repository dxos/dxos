//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '../../../services';
import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './identity';

Test.describe('halo identity', () => {
  Test.it('should log if identity is not initialized', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(1);
      Test.expect(logs[0].args).toEqual(['Identity not initialized.']);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise));

  Test.it('should print identity if initialized', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity({ displayName: 'Test' }));
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(2);
      Test.expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      Test.expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise));
});
