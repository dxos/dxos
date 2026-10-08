//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';

import { ANTHROPIC_SOURCE, CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import { anthropicCredential } from './claude-code-edge-agent.ts';

const TestLayer = TestDatabaseLayer({ types: [AccessToken.AccessToken] });

const addToken = (source: string, token: string) => Database.add(Obj.make(AccessToken.AccessToken, { source, token }));

describe('Claude Code (cloud) credential', () => {
  it.effect('lends the Claude subscription token before the API key', () =>
    Effect.gen(function* () {
      yield* addToken(ANTHROPIC_SOURCE, 'sk-ant-api03-key');
      yield* addToken(CLAUDE_CODE_TOKEN_SOURCE, 'sk-ant-oat01-subscription');
      expect(yield* anthropicCredential).toEqual({ kind: 'oauth', value: 'sk-ant-oat01-subscription' });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('falls back to the API key', () =>
    Effect.gen(function* () {
      yield* addToken(ANTHROPIC_SOURCE, 'sk-ant-api03-key');
      expect(yield* anthropicCredential).toEqual({ kind: 'api-key', value: 'sk-ant-api03-key' });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('lends nothing when no token is connected', () =>
    Effect.gen(function* () {
      expect(yield* anthropicCredential).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );
});
