//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '../../../services';
import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './create';

Test.describe('halo create', () => {
  Test.it('should create an identity without a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(2);
      Test.expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      Test.expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise),
  );

  Test.it('should create an identity with a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.some('Example') });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      Test.expect(logs).toHaveLength(2);
      Test.expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      Test.expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, Effect.runPromise),
  );
});
