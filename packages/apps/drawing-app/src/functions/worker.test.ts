//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import worker, { type Env, LANDING_PATH } from './worker.ts';

const ORIGIN = 'https://diagram.test';

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
    expect(await response.text()).toBe('asset /api/other');
    expect(upstream).toHaveLength(0);
  });

  test('the share API answers on every host', async () => {
    const response = await worker.fetch(new Request(`${LANDING}/api/share/unknown`), landingEnv());
    expect(response.status).toBe(404);
  });

  test('a landing host serves the landing page at its root', async () => {
    const response = await worker.fetch(new Request(`${LANDING}/`), landingEnv());
    expect(await response.text()).toBe(`asset ${LANDING_PATH}`);
  });

  test('a landing host serves files as assets', async () => {
    const response = await worker.fetch(new Request(`${LANDING}/arch.dx.svg`), landingEnv());
    expect(await response.text()).toBe('asset /arch.dx.svg');
  });

  test('a landing host sends app addresses and app links to the app host', async () => {
    for (const path of ['/space/diagram', '/?spaceInvitationCode=abc', '/?d=abc']) {
      const response = await worker.fetch(new Request(`${LANDING}${path}`), landingEnv());
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(`${ORIGIN}${path}`);
    }
  });

  test('the app host serves the app at its root', async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/`), landingEnv());
    expect(await response.text()).toBe('asset /');
  });
});

const LANDING = 'https://landing.test';

const landingEnv = () =>
  env({ LANDING_HOSTS: 'landing.test, www.landing.test', APP_ORIGIN: ORIGIN, SHARES: emptyBucket });

const emptyBucket: Env['SHARES'] = { get: async () => null, put: async () => null };

const env = (overrides: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: async (request) => new Response(`asset ${new URL(request.url).pathname}`) },
  SHARES: emptyBucket,
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

const stubUpstream = () => {
  const requests: { url: string; headers: Headers }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    await new Response(init.body).arrayBuffer();
    requests.push({ url, headers: new Headers(init.headers) });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return requests;
};
