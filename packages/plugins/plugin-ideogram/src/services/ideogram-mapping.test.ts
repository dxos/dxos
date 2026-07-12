//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { afterEach, describe, test } from 'vitest';

import { ImageGeneration } from '@dxos/plugin-image/types';

import { IDEOGRAM_GENERATE_URL } from '../constants';
import { mapIdeogramResponse } from './ideogram-mapping';
import { generateWithIdeogram } from './IdeogramClient';

describe('ideogram mapping', () => {
  test('maps data entries and drops url-less ones', ({ expect }) => {
    const images = mapIdeogramResponse(
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
      { prompt: 'a', model: 'V_2' },
    );

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      url: 'https://img/1.png',
      prompt: 'a',
      model: 'V_2',
      resolution: '1024x1024',
      seed: 7,
      styleType: 'REALISTIC',
      isImageSafe: true,
    });
    expect(images[0].metadata).toMatchObject({ requestId: 'req-1', created: '2026-07-11T00:00:00Z' });
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

    expect(result.images.map((image) => image.url)).toEqual(['https://img/a.png', 'https://img/b.png']);
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

    await expect(generateWithIdeogram({ prompt: 'x' })).rejects.toBeInstanceOf(ImageGeneration.MissingCredentialError);
    expect(called).toBe(false);
  });

  test('throws GenerationError on non-2xx', async ({ expect }) => {
    globalThis.fetch = (async () => new Response('nope', { status: 401 })) as typeof fetch;
    await expect(generateWithIdeogram({ prompt: 'x' }, Redacted.make('sk'))).rejects.toBeInstanceOf(
      ImageGeneration.GenerationError,
    );
  });
});
