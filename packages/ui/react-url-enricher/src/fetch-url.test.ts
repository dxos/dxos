//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { clearUrlCache, fetchManyUrls, fetchUrl } from './fetch-url';

const mockResponse = (body: string, init?: { status?: number; contentType?: string }) =>
  new Response(body, {
    status: init?.status ?? 200,
    headers: { 'content-type': init?.contentType ?? 'text/plain' },
  });

describe('fetchUrl', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    clearUrlCache();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('hits the proxy endpoint with the URL as a query param', async ({ expect }) => {
    const spy = vi.fn(async () => mockResponse('plain text'));
    globalThis.fetch = spy as any;

    await fetchUrl('https://example.com/page?q=1');

    expect(spy).toHaveBeenCalledWith('/api/fetch?url=https%3A%2F%2Fexample.com%2Fpage%3Fq%3D1', expect.anything());
  });

  test('converts HTML responses to plain text', async ({ expect }) => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse('<h1>hello</h1><script>nope</script>', { contentType: 'text/html; charset=utf-8' }),
    ) as any;

    const text = await fetchUrl('https://example.com');
    expect(text).toBe('hello');
  });

  test('leaves non-HTML responses alone', async ({ expect }) => {
    globalThis.fetch = vi.fn(async () => mockResponse('raw markdown', { contentType: 'text/plain' })) as any;

    const text = await fetchUrl('https://example.com/raw');
    expect(text).toBe('raw markdown');
  });

  test('caches across calls', async ({ expect }) => {
    const spy = vi.fn(async () => mockResponse('cached'));
    globalThis.fetch = spy as any;

    await fetchUrl('https://example.com/cache-me');
    await fetchUrl('https://example.com/cache-me');
    await fetchUrl('https://example.com/cache-me');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('returns undefined on non-OK response', async ({ expect }) => {
    globalThis.fetch = vi.fn(async () => mockResponse('nope', { status: 502 })) as any;

    const text = await fetchUrl('https://example.com/down');
    expect(text).toBeUndefined();
  });

  test('returns undefined on thrown error', async ({ expect }) => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network');
    }) as any;

    const text = await fetchUrl('https://example.com/boom');
    expect(text).toBeUndefined();
  });

  test('respects maxLength', async ({ expect }) => {
    globalThis.fetch = vi.fn(async () => mockResponse('a'.repeat(1000))) as any;

    const text = await fetchUrl('https://example.com/long', { maxLength: 10 });
    expect(text).toHaveLength(10);
  });
});

describe('fetchManyUrls', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    clearUrlCache();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('skips URLs that fail', async ({ expect }) => {
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('fail')) {
        return mockResponse('', { status: 500 });
      }
      return mockResponse('ok');
    }) as any;

    const result = await fetchManyUrls(['https://a.com', 'https://fail.com', 'https://b.com']);
    expect(result.size).toBe(2);
    expect(result.has('https://a.com')).toBe(true);
    expect(result.has('https://b.com')).toBe(true);
    expect(result.has('https://fail.com')).toBe(false);
  });

  test('returns empty map for empty input', async ({ expect }) => {
    globalThis.fetch = vi.fn() as any;
    const result = await fetchManyUrls([]);
    expect(result.size).toBe(0);
  });
});
