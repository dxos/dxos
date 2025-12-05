//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './identity';

describe('halo identity', () => {
  it('should log if identity is not initialized', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(logs[0].args).toEqual(['Identity not initialized.']);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should print identity if initialized', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity({ displayName: 'Test' }));
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(2);
      expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
