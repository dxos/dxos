//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { Task } from '@dxos/types';

import { TestConsole, TestLayer } from '../../../testing';
import { spaceLayer } from '../../../util';

import { handler } from './query';

describe('spaces query', () => {
  it('should query empty space', () =>
    Effect.gen(function* () {
      // TODO(wittjosiah): Create test runtime so that client service can be shared with `beforeEach`.
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* Effect.tryPromise(() => client.spaces.default.waitUntilReady());
      const space = client.spaces.default;
      yield* handler({ typename: Option.some(Task.Task.typename) }).pipe(
        Effect.provide(spaceLayer(Option.some(space.id))),
      );
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(TestConsole.extractJsonString(logs[0])).toEqual('[]');
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should query space for objects', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.addTypes([Task.Task]));
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      const space = client.spaces.default;
      yield* Effect.tryPromise(() => space.waitUntilReady());
      space.db.add(Obj.make(Task.Task, { title: 'Task 1' }));
      space.db.add(Obj.make(Task.Task, { title: 'Task 2' }));
      yield* handler({ typename: Option.some(Task.Task.typename) }).pipe(
        Effect.provide(spaceLayer(Option.some(space.id))),
      );
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const formattedObjects = TestConsole.parseJson(logs[0]);
      expect(formattedObjects).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
