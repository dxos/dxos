//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import handler from './_worker.ts';

const INDEX_HTML = '<!doctype html><title>Composer</title>';
const ARCHIVED_CHUNK = 'assets/async-OLDHASH0.js';

/** The asset server as the Worker sees it: `index.html` at `/`, and a 404 for everything it misses. */
const assets = {
  fetch: async (request: Request) =>
    new URL(request.url).pathname === '/'
      ? new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html' } })
      : new Response('Not Found', { status: 404 }),
};

/** A retention bucket holding one chunk a previous build shipped. */
const archive = {
  get: async (key: string) =>
    key === ARCHIVED_CHUNK
      ? {
          body: 'export {};',
          httpEtag: '"archived"',
          writeHttpMetadata: (headers: Headers) => headers.set('Content-Type', 'text/javascript'),
        }
      : null,
};

const fetch = handler.fetch!;
const env = { ASSETS: assets, ASSET_ARCHIVE: archive } as unknown as Parameters<typeof fetch>[1];

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(new Request(`https://composer.test${path}`, { headers }), env, {} as never);

describe('asset misses', () => {
  test('a navigation to a client-side route gets index.html', async () => {
    const response = await get('/space/v1.2/doc', { 'Sec-Fetch-Mode': 'navigate' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  test('a chunk a previous build shipped comes from the archive', async () => {
    const response = await get(`/${ARCHIVED_CHUNK}`, { 'Sec-Fetch-Mode': 'cors' });
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Asset-Source')).toBe('archive');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
  });

  test('a chunk in neither the build nor the archive is a 404 no cache keeps', async () => {
    const response = await get('/assets/async-GONE0000.js', { 'Sec-Fetch-Mode': 'cors' });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('feedback logs', () => {
  const upload = async (body: string, contentType: string) => {
    const puts: { key: string; contentType?: string }[] = [];
    const bucket = {
      put: async (key: string, _body: ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => {
        puts.push({ key, contentType: options?.httpMetadata?.contentType });
      },
    };
    const response = await fetch(
      new Request('https://composer.test/api/feedback-logs', {
        method: 'POST',
        headers: {
          'Origin': 'https://composer.test',
          'Content-Type': contentType,
          'Content-Length': String(new TextEncoder().encode(body).byteLength),
        },
        body,
      }),
      { ...env, FEEDBACK_LOGS: bucket } as unknown as Parameters<typeof fetch>[1],
      {} as never,
    );
    return { response, puts };
  };

  test('a gzipped upload is stored as .ndjson.gz', async () => {
    const { response, puts } = await upload('gz', 'application/gzip');
    expect(response.status).toBe(200);
    const { key } = await response.json();
    expect(key).toMatch(/^logs\/\d{4}-\d{2}-\d{2}\/[\w-]+\.ndjson\.gz$/);
    expect(puts).toEqual([{ key, contentType: 'application/gzip' }]);
  });

  test('a plain NDJSON upload from an older client is stored as .ndjson', async () => {
    const { response, puts } = await upload('{}\n', 'application/x-ndjson');
    expect(response.status).toBe(200);
    const { key } = await response.json();
    expect(key).toMatch(/\.ndjson$/);
    expect(puts).toEqual([{ key, contentType: 'application/x-ndjson' }]);
  });
});

describe('rss proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('forwards the client User-Agent, without which a WAF-fronted feed answers 406', async () => {
    const feed = vi.fn(async (_url: string, init?: RequestInit) =>
      new Headers(init?.headers).has('User-Agent')
        ? new Response('<rss version="2.0"/>', { headers: { 'Content-Type': 'text/xml' } })
        : new Response(null, { status: 406 }),
    );
    vi.stubGlobal('fetch', feed);

    const url = encodeURIComponent('https://www.theguardian.com/profile/jonathanfreedland/rss');
    const response = await get(`/api/rss?url=${url}`, { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' });
    expect(response.status).toBe(200);
    expect(new Headers(feed.mock.calls[0][1]?.headers).get('User-Agent')).toBe('Mozilla/5.0 (X11; Linux x86_64)');
  });
});
