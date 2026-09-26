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
