//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  MAX_SOURCE_BYTES,
  NAME_HEADER,
  NOT_FOUND_MESSAGE,
  REFRESH_AFTER_MS,
  type ShareBucket,
  type ShareEnv,
  type ShareObject,
  type SharePutOptions,
  handleShare,
  newShareId,
} from './share.ts';

const ORIGIN = 'https://app.drawing.sh';
const SOURCE = 'node A\nnode B right-of A\nedge A -> B "calls"\n';

type Stored = { text: string; uploaded: Date; options?: SharePutOptions };

/** An R2 stand-in over a map, with a settable clock for each write's upload time. */
const makeBucket = (clock: { now: number }) => {
  const objects = new Map<string, Stored>();
  const bucket: ShareBucket = {
    get: async (key) => {
      const stored = objects.get(key);
      if (!stored) {
        return null;
      }
      const object: ShareObject = {
        uploaded: stored.uploaded,
        customMetadata: stored.options?.customMetadata,
        text: async () => stored.text,
      };
      return object;
    },
    put: async (key, value, options) => {
      objects.set(key, { text: value, uploaded: new Date(clock.now), options });
      return null;
    },
  };
  return { bucket, objects };
};

const setup = ({ limited = false } = {}) => {
  const clock = { now: Date.parse('2026-10-01T00:00:00Z') };
  const { bucket, objects } = makeBucket(clock);
  const keys: string[] = [];
  const env: ShareEnv = {
    SHARES: bucket,
    SHARE_RATE_LIMIT: {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: !limited };
      },
    },
  };
  const send = (path: string, init?: RequestInit) =>
    handleShare(new Request(`${ORIGIN}${path}`, init), env, { now: () => clock.now });
  const share = (body: string, headers: Record<string, string> = {}) =>
    send('/api/share', { method: 'POST', body, headers: { 'CF-Connecting-IP': '203.0.113.7', ...headers } });
  return { clock, objects, keys, send, share };
};

const readJson = async (response: Response): Promise<{ id: string; url: string }> => {
  const value: unknown = await response.json();
  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'url' in value &&
    typeof value.id === 'string' &&
    typeof value.url === 'string'
  ) {
    return { id: value.id, url: value.url };
  }
  throw new Error(`unexpected body: ${JSON.stringify(value)}`);
};

describe('share API', () => {
  test('ids are 128-bit base64url', ({ expect }) => {
    const ids = new Set(Array.from({ length: 100 }, newShareId));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
  });

  test('a posted source comes back as plain text from its link', async ({ expect }) => {
    const { share, send, keys } = setup();
    const created = await share(SOURCE);
    expect(created.status).toBe(201);
    const { id, url } = await readJson(created);
    expect(url).toBe(`${ORIGIN}/?d=${id}`);
    expect(keys).toEqual(['203.0.113.7']);

    const response = await send(`/api/share/${id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.text()).toBe(SOURCE);
  });

  test('a name posted with the source comes back in a header', async ({ expect }) => {
    const { send } = setup();
    const { id } = await readJson(await send('/api/share?name=arch%3Cscript%3E', { method: 'POST', body: SOURCE }));
    expect((await send(`/api/share/${id}`)).headers.get(NAME_HEADER)).toBe('archscript');
  });

  test('a missing or malformed id is a 404 with the expiry message', async ({ expect }) => {
    const { send } = setup();
    for (const path of [`/api/share/${newShareId()}`, '/api/share/not-an-id', '/api/share/']) {
      const response = await send(path);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe(NOT_FOUND_MESSAGE);
    }
  });

  test('a source over the cap is a 413 and is not stored', async ({ expect }) => {
    const { share, objects } = setup();
    const response = await share('x'.repeat(MAX_SOURCE_BYTES + 1));
    expect(response.status).toBe(413);
    expect(objects.size).toBe(0);
  });

  test('an empty or non-UTF-8 body is a 400', async ({ expect }) => {
    const { send, objects } = setup();
    expect((await send('/api/share', { method: 'POST', body: '  \n' })).status).toBe(400);
    expect((await send('/api/share', { method: 'POST', body: new Uint8Array([0xff, 0xfe, 0x00]) })).status).toBe(400);
    expect(objects.size).toBe(0);
  });

  test('a caller over the rate limit gets a 429', async ({ expect }) => {
    const { share, objects } = setup({ limited: true });
    const response = await share(SOURCE);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(objects.size).toBe(0);
  });

  test('opening a share older than a day rewrites it, restarting its expiry', async ({ expect }) => {
    const { share, send, clock, objects } = setup();
    const { id } = await readJson(await share(SOURCE));
    const created = objects.get(id)?.uploaded.getTime();

    clock.now += REFRESH_AFTER_MS / 2;
    await send(`/api/share/${id}`);
    expect(objects.get(id)?.uploaded.getTime()).toBe(created);

    clock.now += REFRESH_AFTER_MS;
    expect(await (await send(`/api/share/${id}`)).text()).toBe(SOURCE);
    expect(objects.get(id)?.uploaded.getTime()).toBe(clock.now);
    expect(objects.get(id)?.options?.customMetadata?.lastOpened).toBe(new Date(clock.now).toISOString());
    expect(objects.get(id)?.text).toBe(SOURCE);
  });

  test('CORS answers only the drawing.sh origins', async ({ expect }) => {
    const { send, share } = setup();
    const preflight = await send('/api/share', { method: 'OPTIONS', headers: { Origin: 'https://drawing.sh' } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('https://drawing.sh');
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toContain('POST');

    for (const origin of ['https://www.drawing.sh', 'http://localhost:5173']) {
      expect((await share(SOURCE, { Origin: origin })).headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
    expect((await share(SOURCE, { Origin: 'https://evil.example' })).headers.get('Access-Control-Allow-Origin')).toBe(
      null,
    );
  });

  test('other methods are a 405', async ({ expect }) => {
    const { send } = setup();
    expect((await send('/api/share')).status).toBe(405);
    expect((await send(`/api/share/${newShareId()}`, { method: 'DELETE' })).status).toBe(405);
  });
});
