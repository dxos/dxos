//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test } from 'vitest';

import { HeyGenProvider } from './heygen-provider';
import { MissingApiKeyError, ProviderFailureError } from './heygen-provider-types';

describe('HeyGenProvider', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const provider = (fetchImpl: typeof globalThis.fetch) =>
    new HeyGenProvider({ fetch: fetchImpl, pollIntervalMs: 1, timeoutMs: 1_000 });

  test('enqueue posts avatar/voice/script and returns the video id as the job id', async ({ expect }) => {
    let captured: { url: string; apiKey: string | null; body: Record<string, unknown> } | undefined;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        apiKey: new Headers(init?.headers).get('X-Api-Key'),
        body: JSON.parse(String(init?.body)),
      };
      return new Response(JSON.stringify({ data: { video_id: 'vid-1' } }));
    }) as typeof fetch;

    const { jobId } = await provider(fetchImpl).enqueue(
      { type: 'video', prompt: 'hello', avatarId: 'av-1', voiceId: 'vo-1' },
      { apiKey: 'sk-test' },
    );

    expect(jobId).toBe('vid-1');
    expect(captured?.url).toContain('/v3/videos');
    expect(captured?.apiKey).toBe('sk-test');
    expect(captured?.body).toMatchObject({ avatar_id: 'av-1', voice_id: 'vo-1', script: 'hello' });
  });

  test('enqueue requires avatar and voice ids', async ({ expect }) => {
    const fetchImpl = (async () => new Response('{}')) as typeof fetch;
    // Missing avatar.
    await expect(
      provider(fetchImpl).enqueue({ type: 'video', prompt: 'x', voiceId: 'vo-1' }, { apiKey: 'sk' }),
    ).rejects.toBeInstanceOf(ProviderFailureError);
    // Missing voice.
    await expect(
      provider(fetchImpl).enqueue({ type: 'video', prompt: 'x', avatarId: 'av-1' }, { apiKey: 'sk' }),
    ).rejects.toBeInstanceOf(ProviderFailureError);
  });

  test('supports video but not audio', ({ expect }) => {
    const fetchImpl = (async () => new Response('{}')) as typeof fetch;
    const instance = provider(fetchImpl);
    expect(instance.supports('video')).toBe(true);
    expect(instance.supports('audio')).toBe(false);
  });

  test('awaitResult polls until completed and returns the url', async ({ expect }) => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      const done = calls >= 2;
      return new Response(
        JSON.stringify({ data: done ? { status: 'completed', url: 'https://cdn/v.mp4' } : { status: 'processing' } }),
      );
    }) as typeof fetch;

    const { url } = await provider(fetchImpl).awaitResult('vid-1', { apiKey: 'sk-test' });
    expect(url).toBe('https://cdn/v.mp4');
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  test('awaitResult throws on a failed job', async ({ expect }) => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ data: { status: 'failed', error: { message: 'boom' } } }))) as typeof fetch;
    await expect(provider(fetchImpl).awaitResult('vid-1', { apiKey: 'sk-test' })).rejects.toBeInstanceOf(
      ProviderFailureError,
    );
  });

  test('listAvatars requests owned avatars (ownership=private), maps id/name, trims and sorts', async ({ expect }) => {
    let url: string | undefined;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      url = String(input);
      return new Response(
        JSON.stringify({
          // Leading newline / non-breaking space (as HeyGen returns for user-named assets) must be
          // trimmed, else they sort before clean names.
          data: [{ id: 'av-2', name: 'Rex' }, { id: 'av-1', name: '\nAngela  ' }, { id: 'no-name' }],
          has_more: false,
        }),
      );
    }) as typeof fetch;

    const avatars = await provider(fetchImpl).listAvatars({ apiKey: 'sk-test' });
    expect(url).toBe('https://api.heygen.com/v3/avatars?ownership=private&limit=50');
    expect(avatars).toEqual([
      { id: 'av-1', name: 'Angela' },
      { id: 'av-2', name: 'Rex' },
    ]);
  });

  test('listAvatars tolerates the v2-shaped body (data.avatars, avatar_id/avatar_name)', async ({ expect }) => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          data: {
            avatars: [{ avatar_id: 'av-1', avatar_name: 'Angela' }, { avatar_id: 'no-name' }],
          },
        }),
      )) as typeof fetch;

    const avatars = await provider(fetchImpl).listAvatars({ apiKey: 'sk-test' });
    expect(avatars).toEqual([{ id: 'av-1', name: 'Angela' }]);
  });

  test('listVoices requests owned voices (type=private), maps the flat data array, trims and sorts', async ({
    expect,
  }) => {
    let url: string | undefined;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      url = String(input);
      return new Response(
        JSON.stringify({
          data: [
            { voice_id: 'vo-2', name: 'Rich', type: 'private' },
            { voice_id: 'vo-1', name: '\nBritpop  ', type: 'private' },
            { voice_id: 'no-name' },
          ],
          has_more: false,
        }),
      );
    }) as typeof fetch;

    const voices = await provider(fetchImpl).listVoices({ apiKey: 'sk-test' });
    expect(url).toBe('https://api.heygen.com/v3/voices?type=private&limit=100');
    expect(voices).toEqual([
      { id: 'vo-1', name: 'Britpop' },
      { id: 'vo-2', name: 'Rich' },
    ]);
  });

  test('requires an api key', async ({ expect }) => {
    const fetchImpl = (async () => new Response('{}')) as typeof fetch;
    await expect(
      provider(fetchImpl).enqueue({ type: 'video', prompt: 'x', avatarId: 'a', voiceId: 'v' }, { apiKey: '' }),
    ).rejects.toBeInstanceOf(MissingApiKeyError);
  });
});
