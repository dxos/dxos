//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, describe, test, vi } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { GitHubFetchError, fetchGitHubText, gitHubRawUrl } from './useGitHubText.ts';

const KEY = { owner: 'dxos', repo: 'dxos', path: 'packages/plugins/plugin-code/src/index.ts', fragment: 'CodePlugin' };

describe('GitHub code fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('builds the raw URL at a ref, ignoring the fragment', ({ expect }) => {
    expect(gitHubRawUrl(KEY, 'abc123')).toBe(
      'https://raw.githubusercontent.com/dxos/dxos/abc123/packages/plugins/plugin-code/src/index.ts',
    );
    expect(gitHubRawUrl(KEY)).toContain('/dxos/dxos/main/');
  });

  test('returns the text of a served file', async ({ expect }) => {
    vi.stubGlobal('fetch', async () => new Response('export const CodePlugin = 1;'));
    await expect(EffectEx.runPromise(fetchGitHubText(gitHubRawUrl(KEY)))).resolves.toBe('export const CodePlugin = 1;');
  });

  test('fails with the status when GitHub does not serve the file', async ({ expect }) => {
    vi.stubGlobal('fetch', async () => new Response('404: Not Found', { status: 404 }));
    const error = await EffectEx.runPromise(Effect.flip(fetchGitHubText(gitHubRawUrl(KEY))));
    expect(error).toEqual(new GitHubFetchError({ url: gitHubRawUrl(KEY), status: 404 }));
  });

  test('fails without a status when the request does not complete', async ({ expect }) => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await EffectEx.runPromise(Effect.flip(fetchGitHubText(gitHubRawUrl(KEY))));
    expect(error).toEqual(new GitHubFetchError({ url: gitHubRawUrl(KEY) }));
  });
});
