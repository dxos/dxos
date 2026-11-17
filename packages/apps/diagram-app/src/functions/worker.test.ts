//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import worker, { type Env } from './worker.ts';

const ORIGIN = 'https://diagram.test';

const env = (overrides: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: async () => new Response('asset') },
  POSTHOG_OTLP_URL: 'https://eu.i.posthog.com/i',
  POSTHOG_PROJECT_TOKEN: 'phc_test',
  ...overrides,
});

const post = (path: string, origin = ORIGIN) =>
  new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin },
    body: '{}',
  });

/** Records each upstream request, reading its body as PostHog would, and answers 200. */
const stubUpstream = () => {
  const requests: { url: string; headers: Headers }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    await new Response(init.body).arrayBuffer();
    requests.push({ url, headers: new Headers(init.headers) });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return requests;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker', () => {
  test('OTLP goes to PostHog with the project token', async () => {
    const upstream = stubUpstream();
    const response = await worker.fetch(post('/api/otel/v1/logs'), env());
    expect(response.status).toBe(200);
    expect(upstream[0].url).toBe('https://eu.i.posthog.com/i/v1/logs');
    expect(upstream[0].headers.get('Authorization')).toBe('Bearer phc_test');
  });

  test('any other path is a static asset', async () => {
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request(`${ORIGIN}/api/other`), env());
    expect(await response.text()).toBe('asset');
    expect(upstream).toHaveLength(0);
  });
});
