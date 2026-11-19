//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import worker, { type Env } from './worker.ts';

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

  test("a landing host serves the site's pages and files from the site's folder", async () => {
    for (const [path, body] of [
      ['/', 'home'],
      ['/docs/', 'docs'],
      ['/arch.dx.svg', 'drawing'],
    ]) {
      const response = await worker.fetch(new Request(`${LANDING}${path}`), landingEnv());
      expect(await response.text()).toBe(body);
    }
  });

  test("a landing host drops the site's folder from a redirect", async () => {
    const response = await worker.fetch(new Request(`${LANDING}/docs`), landingEnv());
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/docs/');
  });

  test("a landing host answers a page the site lacks with the site's 404 page", async () => {
    const response = await worker.fetch(new Request(`${LANDING}/docs/missing/`), landingEnv());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not found');
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
    expect(await response.text()).toBe('app');
  });
});

const LANDING = 'https://landing.test';

const landingEnv = () =>
  env({ LANDING_HOSTS: 'landing.test, www.landing.test', APP_ORIGIN: ORIGIN, SHARES: emptyBucket, ASSETS: assets });

const SITE: Record<string, string> = {
  '/site/': 'home',
  '/site/docs/': 'docs',
  '/site/arch.dx.svg': 'drawing',
  '/site/404.html': 'not found',
};

/** The assets as Cloudflare serves them: a folder redirects to its slash, and a path they lack gets the app's page. */
const assets: Env['ASSETS'] = {
  fetch: async (request) => {
    const { pathname } = new URL(request.url);
    if (SITE[`${pathname}/`]) {
      return new Response(null, { status: 307, headers: { Location: `${pathname}/` } });
    }
    const body = SITE[pathname] ?? 'app';
    return new Response(body, { headers: { 'Content-Type': 'text/html', 'ETag': `"${body}"` } });
  },
};

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
