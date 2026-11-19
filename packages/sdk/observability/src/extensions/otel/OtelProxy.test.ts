//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import * as OtelProxy from './OtelProxy.ts';

const ORIGIN = 'https://app.test';

const options: OtelProxy.Options = {
  url: 'https://eu.i.posthog.com/i',
  token: 'phc_test',
  extraOrigins: new Set(['tauri://localhost']),
  maxBodySize: 16,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OtelProxy', () => {
  test('forwards a signal to PostHog with the project token', async () => {
    const upstream = stubUpstream();
    const response = await OtelProxy.handle(post('/api/otel/v1/logs'), options);
    expect(response?.status).toBe(200);
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(upstream).toEqual([{ url: 'https://eu.i.posthog.com/i/v1/logs', headers: expect.any(Headers), body: '{}' }]);
    expect(upstream[0].headers.get('Authorization')).toBe('Bearer phc_test');
  });

  test('admits an extra origin and refuses any other, or none', async () => {
    const upstream = stubUpstream();
    expect((await OtelProxy.handle(post('/api/otel/v1/traces', 'tauri://localhost'), options))?.status).toBe(200);
    expect((await OtelProxy.handle(post('/api/otel/v1/traces', 'https://elsewhere.test'), options))?.status).toBe(403);
    expect((await OtelProxy.handle(post('/api/otel/v1/traces', null), options))?.status).toBe(403);
    expect(upstream).toHaveLength(1);
  });

  test('answers 503 without the token and 413 over the size limit', async () => {
    stubUpstream();
    expect((await OtelProxy.handle(post('/api/otel/v1/metrics'), { ...options, token: undefined }))?.status).toBe(503);
    expect((await OtelProxy.handle(post('/api/otel/v1/metrics', ORIGIN, 'x'.repeat(17)), options))?.status).toBe(413);
  });

  test('answers 502 when PostHog is unreachable', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    expect((await OtelProxy.handle(post('/api/otel/v1/logs'), options))?.status).toBe(502);
  });

  test('leaves any other path to the caller', () => {
    expect(OtelProxy.handle(post('/api/otel/v1/other'), options)).toBeUndefined();
    expect(OtelProxy.handle(post('/api/feedback-logs'), options)).toBeUndefined();
  });
});

const post = (path: string, origin: string | null = ORIGIN, body = '{}') =>
  new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body,
  });

const stubUpstream = () => {
  const requests: { url: string; headers: Headers; body: string }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = await new Response(init.body).text();
    requests.push({ url, headers: new Headers(init.headers), body });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return requests;
};
