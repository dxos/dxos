//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './info';

describe('device info', () => {
  it('should show device info', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(Array.isArray(logs[0].args) ? String(logs[0].args[0]) : (logs[0].args as string));
      expect(parsed).toHaveProperty('deviceKey');
      expect(parsed).toHaveProperty('profile');
      expect(parsed.deviceKey).toBe(client.halo.device?.deviceKey.toHex());
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});

