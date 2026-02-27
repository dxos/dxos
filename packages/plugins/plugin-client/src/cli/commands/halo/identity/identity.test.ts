//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';
import { create, toPublicKey } from '@dxos/protocols/buf';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { handler } from './identity';

describe('halo identity', () => {
  it('should log if identity is not initialized', () =>
    Effect.gen(function* () {
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      expect(TestConsole.extractJsonString(logs[0])).toEqual(
        JSON.stringify({ error: 'Identity not initialized' }, null, 2),
      );
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should print identity if initialized', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'Test' })));
      yield* handler();
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      const identityKey = client.halo.identity.get()?.identityKey;
      expect(parsedIdentity).toEqual({
        identityKey: identityKey ? toPublicKey(identityKey).toHex() : undefined,
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
