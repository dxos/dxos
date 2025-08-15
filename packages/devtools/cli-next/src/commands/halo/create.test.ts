//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import { Effect, LogLevel, Option } from 'effect';

import { ClientService } from '../../services';
import { TestLogger, testLayer } from '../../testing';

import { createIdentity } from './create';

describe('halo create', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  it('should create an identity without a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* createIdentity({ displayName: Option.none() });
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toEqual(['Identity key:', client.halo.identity.get()?.identityKey.toHex()]);
      expect(logs[1].message).toEqual(['Display name:', client.halo.identity.get()?.profile?.displayName]);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));

  it('should create an identity with a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* createIdentity({ displayName: Option.some('Example') });
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toEqual(['Identity key:', client.halo.identity.get()?.identityKey.toHex()]);
      expect(logs[1].message).toEqual(['Display name:', client.halo.identity.get()?.profile?.displayName]);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));
});
