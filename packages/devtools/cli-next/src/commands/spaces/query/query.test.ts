//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import { Effect, LogLevel } from 'effect';

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { ClientService } from '../../../services';
import { TestLogger, testLayer } from '../../../testing';

import { handler } from './query';

describe('spaces query', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  // TOOD(burdon): Convert tests to use factored out functions (not CLI).

  it('should query empty space', () =>
    Effect.gen(function* () {
      // TODO(wittjosiah): Create test runtime so that client service can be shared with `beforeEach`.
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* Effect.tryPromise(() => client.spaces.default.waitUntilReady());
      yield* handler({ spaceId: client.spaces.default.id, typename: DataType.Task.typename });
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toEqual(['[]']);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));

  it('should query space for objects', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      client.addTypes([DataType.Task]);
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      const space = client.spaces.default;
      yield* Effect.tryPromise(() => space.waitUntilReady());
      space.db.add(Obj.make(DataType.Task, { title: 'Task 1' }));
      space.db.add(Obj.make(DataType.Task, { title: 'Task 2' }));
      yield* handler({ spaceId: space.id, typename: DataType.Task.typename });
      const logs = testLogger.getLogsByLevel(LogLevel.Info);
      expect(logs).toHaveLength(1);
      const formattedObjects = JSON.parse(logs[0].message as string);
      expect(formattedObjects).toHaveLength(2);
    }).pipe(Effect.provide(testLayer(testLogger)), Effect.scoped, Effect.runPromise));
});
