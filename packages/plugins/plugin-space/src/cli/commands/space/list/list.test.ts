//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';

import { handler } from './list';

describe('spaces list', () => {
  it('should list empty space list', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(TestConsole.extractJsonString(logs[0])).toEqual('[]');
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should list spaces', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.create());
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const formattedSpaces = TestConsole.parseJson(logs[0]);
      expect(formattedSpaces).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
