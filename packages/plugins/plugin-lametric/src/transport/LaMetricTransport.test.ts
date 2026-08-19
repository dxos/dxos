//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type FetchLike, selectTransport } from './LaMetricTransport';

const ok: FetchLike = async () => ({ ok: true, status: 200 });
const credentials = { appId: 'com.lametric.abc', widgetId: '123', accessToken: 'secret' };

describe('selectTransport', () => {
  test('prefers the local device when an address is configured', ({ expect }) => {
    const transport = selectTransport({ ...credentials, address: '192.168.1.50' }, ok);
    expect(transport?.kind).toBe('local');
    expect(transport?.url).toBe('https://192.168.1.50:4343/api/v1/dev/widget/update/com.lametric.abc/123');
  });

  test('honours an explicit scheme and port', ({ expect }) => {
    const transport = selectTransport({ ...credentials, address: '192.168.1.50', scheme: 'http' }, ok);
    expect(transport?.url).toBe('http://192.168.1.50:8080/api/v1/dev/widget/update/com.lametric.abc/123');
  });

  test('falls back to the cloud without an address', ({ expect }) => {
    const transport = selectTransport(credentials, ok);
    expect(transport?.kind).toBe('cloud');
    expect(transport?.url).toBe('https://developer.lametric.com/api/v1/dev/widget/update/com.lametric.abc/123');
  });

  test('yields nothing when credentials are incomplete', ({ expect }) => {
    expect(selectTransport({ address: '192.168.1.50' }, ok)).toBeUndefined();
    expect(selectTransport({ appId: 'com.lametric.abc', accessToken: 'secret' }, ok)).toBeUndefined();
  });

  test('accepts the device certificate only for a local https push', async ({ expect }) => {
    const seen: (unknown | undefined)[] = [];
    const capture: FetchLike = async (_url, init) => {
      seen.push(init.danger);
      return { ok: true, status: 200 };
    };
    await selectTransport({ ...credentials, address: '10.0.0.2' }, capture)!.push({ frames: [] });
    await selectTransport({ ...credentials, address: '10.0.0.2', scheme: 'http' }, capture)!.push({ frames: [] });
    await selectTransport(credentials, capture)!.push({ frames: [] });

    expect(seen[0]).toEqual({ acceptInvalidCerts: true, acceptInvalidHostnames: true });
    expect(seen[1]).toBeUndefined();
    expect(seen[2]).toBeUndefined();
  });

  test('sends the access token and the payload, and throws on a rejection', async ({ expect }) => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
    const capture: FetchLike = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body });
      return { ok: false, status: 401 };
    };
    const transport = selectTransport(credentials, capture)!;
    await expect(transport.push({ frames: [{ text: 'hi' }] })).rejects.toThrow('401');
    expect(calls[0].headers['X-Access-Token']).toBe('secret');
    expect(JSON.parse(calls[0].body)).toEqual({ frames: [{ text: 'hi' }] });
  });
});
