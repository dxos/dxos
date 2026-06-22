//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestContextService } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { AccessToken } from '@dxos/types';

import * as Sandbox from '../types/Sandbox';
import { mergeExecEnv, resolveSandboxCredentialEnv } from './sandbox-env';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [Sandbox.Sandbox, AccessToken.AccessToken],
});

describe('sandbox-env', () => {
  it.effect('resolves credential refs to env vars', (ctx) =>
    Effect.gen(function* () {
      const token = yield* Database.add(AccessToken.make({ source: 'example.com', token: 'secret-value' }));
      const env = yield* resolveSandboxCredentialEnv([{ env: 'API_TOKEN', token: Ref.make(token) }]);
      expect(env).toEqual({ API_TOKEN: 'secret-value' });
    }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
  );

  it.effect('mergeExecEnv lets exec overrides win', (ctx) =>
    Effect.gen(function* () {
      const token = yield* Database.add(AccessToken.make({ source: 'example.com', token: 'from-sandbox' }));
      const env = yield* mergeExecEnv([{ env: 'API_TOKEN', token: Ref.make(token) }], { API_TOKEN: 'override' });
      expect(env).toEqual({ API_TOKEN: 'override' });
    }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
  );
});
