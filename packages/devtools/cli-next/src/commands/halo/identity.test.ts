//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import { Effect, LogLevel } from 'effect';

import { ClientService } from '../../services';
import { TestLogger, testLayer } from '../../testing';

import { getIdentity } from './identity';

describe('halo identity', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  it('should log if identity is not initialized', () =>
    Effect.gen(function* () {
      yield* getIdentity();
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toEqual(['Identity not initialized.']);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));

  it('should print identity if initialized', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity({ displayName: 'Test' }));
      yield* getIdentity();
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toEqual(['Identity key:', client.halo.identity.get()?.identityKey.toHex()]);
      expect(logs[1].message).toEqual(['Display name:', client.halo.identity.get()?.profile?.displayName]);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));
});
