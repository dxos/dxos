//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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
  const FEED_URL = 'https://www.theguardian.com/profile/jonathanfreedland/rss';
  const FEED_XML = '<?xml version="1.0"?><rss version="2.0"><channel><title>Jonathan Freedland</title></channel></rss>';
  const BROWSER_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

  /** An origin behind a bot-filtering WAF: without a browser's User-Agent and Accept-Language, a 406. */
  const origin = vi.fn(async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    return headers.get('User-Agent')?.startsWith('Mozilla/5.0') && headers.has('Accept-Language')
      ? new Response(FEED_XML, { headers: { 'Content-Type': 'text/xml; charset=UTF-8' } })
      : new Response('Not Acceptable', { status: 406, headers: { 'Content-Type': 'text/plain' } });
  });

  const proxy = (headers?: Record<string, string>) => get(`/api/rss?url=${encodeURIComponent(FEED_URL)}`, headers);

  const upstreamHeaders = () => new Headers(origin.mock.calls[0][1]?.headers);

  beforeEach(() => {
    vi.stubGlobal('fetch', origin);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    origin.mockClear();
  });

  test('a feed behind a bot-filtering WAF is fetched with the browser headers', async () => {
    const response = await proxy({ 'User-Agent': BROWSER_USER_AGENT, 'Accept-Language': 'en-GB,en;q=0.9' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(FEED_XML);
    expect(upstreamHeaders().get('User-Agent')).toBe(BROWSER_USER_AGENT);
    expect(upstreamHeaders().get('Accept-Language')).toBe('en-GB,en;q=0.9');
    expect(upstreamHeaders().get('Accept')).toMatch(/^application\/rss\+xml, /);
  });

  test('a non-browser client still reads as a browser upstream', async () => {
    const response = await proxy({ 'User-Agent': 'curl/8.5.0', 'Accept-Language': '*' });
    expect(response.status).toBe(200);
    expect(upstreamHeaders().get('User-Agent')).toMatch(/^Mozilla\/5\.0 /);
    expect(upstreamHeaders().get('Accept-Language')).not.toBe('*');
  });

  test('an origin rejection reaches the client with its status and body', async () => {
    origin.mockResolvedValueOnce(new Response('Not Acceptable', { status: 406 }));
    const response = await proxy({ 'User-Agent': BROWSER_USER_AGENT });
    expect(response.status).toBe(406);
    expect(await response.text()).toBe('Not Acceptable');
  });
});
