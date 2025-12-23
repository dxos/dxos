//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { handler } from './members';

describe('space members', () => {
  it('should list space members', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const space = yield* Effect.tryPromise(() => client.spaces.create());
      yield* Effect.tryPromise(() => space.waitUntilReady());
      yield* handler({ spaceId: Option.some(space.id) });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<Array<{ key: string; presence: string }>>(logs[0]);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('key');
      expect(parsed[0]).toHaveProperty('presence');
      // name might be undefined if identity has no displayName
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should list default space members when spaceId is not provided', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler({ spaceId: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<Array<{ key: string; presence: string }>>(logs[0]);
      expect(Array.isArray(parsed)).toBe(true);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
