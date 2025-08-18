//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import { Effect, LogLevel } from 'effect';

import { ClientService } from '../../../services';
import { TestLogger, testLayer } from '../../../testing';

import { handler } from './list';

describe('spaces list', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  it('should list empty space list', () =>
    Effect.gen(function* () {
      yield* handler();
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(1);
      expect(logs[0].args).toEqual(['[]']);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));

  it('should list spaces', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.create());
      yield* handler();
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(1);
      const formattedSpaces = JSON.parse(logs[0].args as string);
      expect(formattedSpaces).toHaveLength(2);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));
});
