//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './list';

describe('spaces list', () => {
  it('should list empty space list', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(Array.isArray(logs[0].args) ? logs[0].args[0] : logs[0].args).toEqual('[]');
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
      const formattedSpaces = JSON.parse(
        Array.isArray(logs[0].args) ? String(logs[0].args[0]) : (logs[0].args as string),
      );
      expect(formattedSpaces).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
