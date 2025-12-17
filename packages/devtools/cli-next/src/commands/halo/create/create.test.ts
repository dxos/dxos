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

describe('halo create', () => {
  it('should create an identity without a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = JSON.parse(
        Array.isArray(logs[0].args) ? String(logs[0].args[0]) : (logs[0].args as string),
      );
      expect(parsedIdentity).toEqual({
        identityKey: client.halo.identity.get()?.identityKey.toHex(),
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should create an identity with a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.some('Example') });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = JSON.parse(
        Array.isArray(logs[0].args) ? String(logs[0].args[0]) : (logs[0].args as string),
      );
      expect(parsedIdentity).toEqual({
        identityKey: client.halo.identity.get()?.identityKey.toHex(),
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
