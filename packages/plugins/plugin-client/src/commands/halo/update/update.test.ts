//
// Copyright 2025 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';

import { handler } from './update';

describe('halo update', () => {
  test('should update identity display name', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* handler({ displayName: 'Updated Name' });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsed = TestConsole.parseJson<{ identityDid: string; displayName: string }>(logs[0]);
      expect(parsed).toHaveProperty('identityDid');
      expect(parsed).toHaveProperty('displayName', 'Updated Name');
      expect(parsed.identityDid).toBe(client.halo.identity.get()?.did);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
