//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { afterEach, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { API_TOKEN_ENV, DEFAULT_MCP_URL, MCP_URL_ENV, requireSession } from './util.ts';

const TOKEN = `dx-api01-${'a'.repeat(48)}`;

describe('requireSession', () => {
  afterEach(() => {
    delete process.env[API_TOKEN_ENV];
    delete process.env[MCP_URL_ENV];
  });

  test('an API token needs no stored session', async ({ expect }) => {
    process.env[API_TOKEN_ENV] = TOKEN;
    const session = await EffectEx.runPromise(requireSession('no-such-profile', Option.none()));
    expect(session.accessToken).toBe(TOKEN);
    expect(session.serverUrl).toBe(DEFAULT_MCP_URL);
    expect(session.refreshToken).toBeUndefined();
  });

  test('--url wins over the environment and loses its /mcp suffix', async ({ expect }) => {
    process.env[API_TOKEN_ENV] = TOKEN;
    process.env[MCP_URL_ENV] = 'https://mcp.dev.dxos.network';
    const session = await EffectEx.runPromise(
      requireSession('no-such-profile', Option.some('https://example.test/mcp')),
    );
    expect(session.serverUrl).toBe('https://example.test');
  });

  test('a value that is not a dx-api01 token is refused', async ({ expect }) => {
    process.env[API_TOKEN_ENV] = 'sk-not-ours';
    const error = await EffectEx.runPromise(Effect.flip(requireSession('no-such-profile', Option.none())));
    expect(error.message).toContain('dx-api01');
  });
});
