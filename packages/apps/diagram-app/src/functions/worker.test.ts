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

const post = (path: string, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: '{}',
  });

/** Records each upstream request and answers 200. */
const stubUpstream = () => {
  const requests: Request[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo, init?: RequestInit) => {
    requests.push(new Request(input, init));
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

  test('OTLP from another origin, or with no origin, is refused', async () => {
    const upstream = stubUpstream();
    expect((await worker.fetch(post('/api/otel/v1/logs', 'https://elsewhere.test'), env())).status).toBe(403);
    expect((await worker.fetch(post('/api/otel/v1/logs', null), env())).status).toBe(403);
    expect(upstream).toHaveLength(0);
  });

  test('OTLP without the token answers 503', async () => {
    stubUpstream();
    const response = await worker.fetch(post('/api/otel/v1/traces'), env({ POSTHOG_PROJECT_TOKEN: undefined }));
    expect(response.status).toBe(503);
  });

  test('any other path is a static asset', async () => {
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request(`${ORIGIN}/api/other`), env());
    expect(await response.text()).toBe('asset');
    expect(upstream).toHaveLength(0);
  });
});
