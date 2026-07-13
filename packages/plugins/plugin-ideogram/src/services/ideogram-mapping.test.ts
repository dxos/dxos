//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { afterEach, describe, test } from 'vitest';

import { GenerationService } from '@dxos/plugin-studio/types';

import { IDEOGRAM_GENERATE_URL } from '../constants';
import { mapIdeogramResponse } from './ideogram-mapping';
import { generateWithIdeogram } from './IdeogramClient';

describe('ideogram mapping', () => {
  test('maps data entries to variants and drops url-less ones', ({ expect }) => {
    const variants = mapIdeogramResponse(
      {
        created: '2026-07-11T00:00:00Z',
        request_id: 'req-1',
        data: [
          {
            url: 'https://img/1.png',
            prompt: 'a',
            resolution: '1024x1024',
            seed: 7,
            is_image_safe: true,
            style_type: 'REALISTIC',
          },
          { url: null, prompt: 'filtered' },
        ],
      },
      { model: 'V_2' },
    );

    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ contentType: 'image/png', url: 'https://img/1.png' });
    expect(variants[0].generation).toMatchObject({
      provider: 'ideogram',
      model: 'V_2',
      prompt: 'a',
      seed: 7,
      requestId: 'req-1',
      createdAt: '2026-07-11T00:00:00Z',
    });
    expect(variants[0].generation?.parameters).toMatchObject({
      resolution: '1024x1024',
      styleType: 'REALISTIC',
      isImageSafe: true,
    });
  });
});

describe('generateWithIdeogram', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('routes through the CORS proxy with the Api-Key header and image_request body', async ({ expect }) => {
    let captured: { url: string; apiKey: string | null; body: Record<string, unknown> } | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      captured = { url: String(input), apiKey: headers.get('Api-Key'), body: JSON.parse(String(init?.body)) };
      return new Response(
        JSON.stringify({ request_id: 'r', data: [{ url: 'https://img/a.png' }, { url: 'https://img/b.png' }] }),
      );
    }) as typeof fetch;

    const result = await generateWithIdeogram(
      { prompt: 'a cat', count: 2, aspectRatio: '1x1' },
      Redacted.make('sk-test'),
    );

    expect(result.variants.map((variant) => variant.url)).toEqual(['https://img/a.png', 'https://img/b.png']);
    // Proxied via the edge CORS proxy: URL rewritten to /<host><path>, Api-Key passed through.
    expect(captured?.url).toContain(new URL(IDEOGRAM_GENERATE_URL).host);
    expect(captured?.url).toContain('/generate');
    expect(captured?.apiKey).toBe('sk-test');
    expect(captured?.body.image_request).toMatchObject({ prompt: 'a cat', num_images: 2, aspect_ratio: '1x1' });
  });

  test('throws MissingCredentialError with no api key (no request made)', async ({ expect }) => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;

    await expect(generateWithIdeogram({ prompt: 'x' })).rejects.toBeInstanceOf(
      GenerationService.MissingCredentialError,
    );
    expect(called).toBe(false);
  });

  test('throws GenerationError on non-2xx', async ({ expect }) => {
    globalThis.fetch = (async () => new Response('nope', { status: 401 })) as typeof fetch;
    await expect(generateWithIdeogram({ prompt: 'x' }, Redacted.make('sk'))).rejects.toBeInstanceOf(
      GenerationService.GenerationError,
    );
  });
});
