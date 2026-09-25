//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

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

const get = (path: string, secFetchMode?: string) =>
  fetch(
    new Request(`https://composer.test${path}`, { headers: secFetchMode ? { 'Sec-Fetch-Mode': secFetchMode } : {} }),
    env,
    {} as never,
  );

describe('asset misses', () => {
  test('a navigation to a client-side route gets index.html', async () => {
    const response = await get('/space/v1.2/doc', 'navigate');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  test('a chunk a previous build shipped comes from the archive', async () => {
    const response = await get(`/${ARCHIVED_CHUNK}`, 'cors');
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Asset-Source')).toBe('archive');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
  });

  test('a chunk in neither the build nor the archive is a 404 no cache keeps', async () => {
    const response = await get('/assets/async-GONE0000.js', 'cors');
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
