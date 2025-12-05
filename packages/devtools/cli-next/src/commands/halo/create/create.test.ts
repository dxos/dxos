//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';

import { TestConsole, TestLayer } from '../../../testing';

import { handler } from './create';

describe('halo create', () => {
  it('should create an identity without a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(2);
      expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));

  it('should create an identity with a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.some('Example') });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(2);
      expect(logs[0].args).toEqual([`Identity key: ${client.halo.identity.get()?.identityKey.toHex()}`]);
      expect(logs[1].args).toEqual([`Display name: ${client.halo.identity.get()?.profile?.displayName}`]);
    }).pipe(Effect.provide(TestLayer), Effect.scoped, runAndForwardErrors));
});
