//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './keys';

describe('halo keys', () => {
  it('should show HALO keys', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<{ identityKey?: string; deviceKey?: string }>(logs[0]);
      expect(parsed).toHaveProperty('identityKey');
      expect(parsed).toHaveProperty('deviceKey');
      expect(parsed.identityKey).toBe(client.halo.identity.get()?.identityKey.toHex());
      expect(parsed.deviceKey).toBe(client.halo.device?.deviceKey.toHex());
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
