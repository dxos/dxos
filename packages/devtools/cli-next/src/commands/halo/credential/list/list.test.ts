//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../../testing';

import { handler } from './list';

describe('halo credential list', () => {
  it('should list HALO credentials', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler({ type: Option.none(), spaceId: Option.none(), timeout: 500, delay: 250 });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson(logs[0]);
      expect(Array.isArray(parsed)).toBe(true);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
