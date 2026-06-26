//
// Copyright 2025 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { EffectEx } from '@dxos/effect';

import { handler } from './identity';

describe('halo identity', () => {
  test('should log if identity is not initialized', ({ expect }) =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(TestConsole.extractJsonString(logs[0])).toEqual(
        JSON.stringify({ error: 'Identity not initialized' }, null, 2),
      );
    }).pipe(Effect.provide(TestLayer), Effect.scoped, EffectEx.runAndForwardErrors));

  test('should print identity if initialized', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity({ displayName: 'Test' }));
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      expect(parsedIdentity).toEqual({
        identityDid: client.halo.identity.get()?.did,
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(TestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});
