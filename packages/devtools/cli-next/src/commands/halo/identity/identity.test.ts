//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './identity';

describe('halo identity', () => {
  it('should log if identity is not initialized', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(Array.isArray(logs[0].args) ? logs[0].args[0] : logs[0].args).toEqual(
        JSON.stringify({ error: 'Identity not initialized' }, null, 2),
      );
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should print identity if initialized', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity({ displayName: 'Test' }));
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = JSON.parse(
        Array.isArray(logs[0].args) ? String(logs[0].args[0]) : (logs[0].args as string),
      );
      expect(parsedIdentity).toEqual({
        identityKey: client.halo.identity.get()?.identityKey.toHex(),
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
