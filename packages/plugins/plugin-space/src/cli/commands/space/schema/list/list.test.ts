//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';

import { handler } from './list';

describe('space schema list', () => {
  it('should list space schemas', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const space = yield* Effect.tryPromise(() => client.spaces.create());
      yield* Effect.tryPromise(() => space.waitUntilReady());
      yield* handler({ spaceId: Option.some(space.id), typename: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson(logs[0]);
      expect(Array.isArray(parsed)).toBe(true);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should list default space schemas when spaceId is not provided', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler({ spaceId: Option.none(), typename: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson(logs[0]);
      expect(Array.isArray(parsed)).toBe(true);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
