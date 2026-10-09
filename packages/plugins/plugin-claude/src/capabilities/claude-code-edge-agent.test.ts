//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { Database, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';

import { ANTHROPIC_SOURCE, CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import { claudeCredentials, credentials } from './claude-code-edge-agent.ts';

const TestLayer = TestDatabaseLayer({ types: [AccessToken.AccessToken] });

const addToken = (source: string, token: string) => Database.add(Obj.make(AccessToken.AccessToken, { source, token }));

describe('Claude Code (cloud) credentials', () => {
  it.effect('lends the Claude subscription token before the API key', () =>
    Effect.gen(function* () {
      yield* addToken(ANTHROPIC_SOURCE, 'sk-ant-api03-key');
      yield* addToken(CLAUDE_CODE_TOKEN_SOURCE, 'sk-ant-oat01-subscription');
      expect(yield* claudeCredentials).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-subscription' });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('falls back to the API key', () =>
    Effect.gen(function* () {
      yield* addToken(ANTHROPIC_SOURCE, 'sk-ant-api03-key');
      expect(yield* claudeCredentials).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-key' });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('lends nothing when no token is connected', () =>
    Effect.gen(function* () {
      expect(yield* claudeCredentials).toEqual({});
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('lends the GitHub token beside the Claude credential, as the variables git and gh read', () =>
    Effect.gen(function* () {
      yield* addToken(CLAUDE_CODE_TOKEN_SOURCE, 'sk-ant-oat01-subscription');
      yield* addToken('github.com', 'ghu_test');
      expect(yield* credentials.pipe(Effect.provide(Credential.AccessTokenResolver.notAvailable))).toEqual({
        CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-subscription',
        GITHUB_TOKEN: 'ghu_test',
        GH_TOKEN: 'ghu_test',
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
