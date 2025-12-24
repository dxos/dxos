//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { handler } from './update';

describe('halo update', () => {
  it('should update identity display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      yield* handler({ displayName: 'Updated Name' });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<{ identityKey: string; displayName: string }>(logs[0]);
      expect(parsed).toHaveProperty('identityKey');
      expect(parsed).toHaveProperty('displayName', 'Updated Name');
      expect(parsed.identityKey).toBe(client.halo.identity.get()?.identityKey.toHex());
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
