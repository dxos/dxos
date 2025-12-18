//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './info';

describe('space info', () => {
  it('should show space info', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const space = yield* Effect.tryPromise(() => client.spaces.create());
      yield* Effect.tryPromise(() => space.waitUntilReady());
      yield* handler({ spaceId: Option.some(space.id) });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<{ id: string; state: string; key: string }>(logs[0]);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('state');
      expect(parsed).toHaveProperty('key');
      expect(parsed.id).toBe(space.id);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should show default space info when spaceId is not provided', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler({ spaceId: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<{ id: string; state: string; key: string }>(logs[0]);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('state');
      expect(parsed).toHaveProperty('key');
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
