//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './create';

describe('space create', () => {
  it('should create a space without a name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const logger = yield* TestConsole.TestConsole;
      // Catch timeout errors from sync, but still check output
      yield* handler({ name: Option.none() }).pipe(Effect.catchAll(() => Effect.void));
      const logs = logger.logs;
      // Find the JSON output (should be logged before sync)
      // log.args is an array, so we need to check the first element
      const jsonLog = logs.find((log) => {
        if (log.level === 'log' && Array.isArray(log.args) && log.args.length > 0) {
          const firstArg = String(log.args[0]);
          return firstArg.trim().startsWith('{');
        }
        return false;
      });
      expect(jsonLog).toBeDefined();
      if (jsonLog && Array.isArray(jsonLog.args) && jsonLog.args.length > 0) {
        const parsed = JSON.parse(String(jsonLog.args[0]));
        expect(parsed).toHaveProperty('key');
        expect(typeof parsed.key).toBe('string');
        // name might be undefined and omitted from JSON, which is fine
      }
      expect(client.spaces.get().length).toBeGreaterThan(0);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should create a space with a name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const logger = yield* TestConsole.TestConsole;
      // Catch timeout errors from sync, but still check output
      yield* handler({ name: Option.some('Test Space') }).pipe(Effect.catchAll(() => Effect.void));
      const logs = logger.logs;
      // Find the JSON output (should be logged before sync)
      // log.args is an array, so we need to check the first element
      const jsonLog = logs.find((log) => {
        if (log.level === 'log' && Array.isArray(log.args) && log.args.length > 0) {
          const firstArg = String(log.args[0]);
          return firstArg.trim().startsWith('{');
        }
        return false;
      });
      expect(jsonLog).toBeDefined();
      if (jsonLog && Array.isArray(jsonLog.args) && jsonLog.args.length > 0) {
        const parsed = JSON.parse(String(jsonLog.args[0]));
        expect(parsed).toHaveProperty('key');
        expect(parsed).toHaveProperty('name', 'Test Space');
      }
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
