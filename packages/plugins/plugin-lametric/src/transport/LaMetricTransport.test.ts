//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type FetchLike, discoverWidgetId, selectTransport } from './LaMetricTransport';

const ok: FetchLike = async () => ({ ok: true, status: 200 });

const local = { address: '192.168.1.50', apiKey: 'device-key', widgetId: 'abc123' };
const cloud = { appId: 'com.lametric.abc', widgetId: 'abc123', accessToken: 'secret' };

describe('selectTransport', () => {
  test('local push targets the stock DIY app over the device v2 API', ({ expect }) => {
    const transport = selectTransport(local, ok);
    expect(transport?.kind).toBe('local');
    expect(transport?.url).toBe('https://192.168.1.50:4343/api/v2/widget/update/com.lametric.diy.devwidget/abc123');
  });

  test('local push honours an explicit scheme and port', ({ expect }) => {
    const transport = selectTransport({ ...local, scheme: 'http' }, ok);
    expect(transport?.url).toBe('http://192.168.1.50:8080/api/v2/widget/update/com.lametric.diy.devwidget/abc123');
  });

  test('cloud push targets a published app over the v1 developer API', ({ expect }) => {
    const transport = selectTransport(cloud, ok);
    expect(transport?.kind).toBe('cloud');
    expect(transport?.url).toBe('https://developer.lametric.com/api/v1/dev/widget/update/com.lametric.abc/abc123');
  });

  test('yields nothing when credentials are incomplete', ({ expect }) => {
    expect(selectTransport({ address: '192.168.1.50', widgetId: 'abc123' }, ok)).toBeUndefined();
    expect(selectTransport({ address: '192.168.1.50', apiKey: 'k' }, ok)).toBeUndefined();
    expect(selectTransport({ appId: 'com.lametric.abc', accessToken: 'secret' }, ok)).toBeUndefined();
    expect(selectTransport({ widgetId: 'abc123', appId: 'com.lametric.abc' }, ok)).toBeUndefined();
  });

  test('the device authenticates with Basic dev:<key>, the cloud with an access token', async ({ expect }) => {
    const seen: Record<string, string>[] = [];
    const capture: FetchLike = async (_url, init) => {
      seen.push(init.headers);
      return { ok: true, status: 200 };
    };
    await selectTransport(local, capture)!.push({ frames: [] });
    await selectTransport(cloud, capture)!.push({ frames: [] });

    expect(seen[0].Authorization).toBe(`Basic ${btoa('dev:device-key')}`);
    expect(seen[0]['X-Access-Token']).toBeUndefined();
    expect(seen[1]['X-Access-Token']).toBe('secret');
    expect(seen[1].Authorization).toBeUndefined();
  });

  test('accepts the device certificate only for a local https push', async ({ expect }) => {
    const seen: unknown[] = [];
    const capture: FetchLike = async (_url, init) => {
      seen.push(init.danger);
      return { ok: true, status: 200 };
    };
    await selectTransport(local, capture)!.push({ frames: [] });
    await selectTransport({ ...local, scheme: 'http' }, capture)!.push({ frames: [] });
    await selectTransport(cloud, capture)!.push({ frames: [] });

    expect(seen[0]).toEqual({ acceptInvalidCerts: true, acceptInvalidHostnames: true });
    expect(seen[1]).toBeUndefined();
    expect(seen[2]).toBeUndefined();
  });

  test('sends the payload and throws on a rejection', async ({ expect }) => {
    const bodies: (string | undefined)[] = [];
    const capture: FetchLike = async (_url, init) => {
      bodies.push(init.body);
      return { ok: false, status: 401 };
    };
    const transport = selectTransport(local, capture)!;
    await expect(transport.push({ frames: [{ text: 'hi' }] })).rejects.toThrow('401');
    expect(JSON.parse(bodies[0]!)).toEqual({ frames: [{ text: 'hi' }] });
  });
});

describe('discoverWidgetId', () => {
  const apps = {
    'com.lametric.clock': { package: 'com.lametric.clock', widgets: { clockwidget: {} } },
    'com.lametric.diy.devwidget': { package: 'com.lametric.diy.devwidget', widgets: { 'diy-uuid': {} } },
  };

  test('finds the DIY widget in the device app list', async ({ expect }) => {
    const fetchImpl: FetchLike = async (url) => {
      expect(url).toBe('https://192.168.1.50:4343/api/v2/device/apps');
      return { ok: true, status: 200, json: async () => apps };
    };
    expect(await discoverWidgetId({ address: '192.168.1.50', apiKey: 'k' }, fetchImpl)).toBe('diy-uuid');
  });

  test('returns nothing when the DIY app is not installed', async ({ expect }) => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ 'com.lametric.clock': { package: 'com.lametric.clock', widgets: { w: {} } } }),
    });
    expect(await discoverWidgetId({ address: '192.168.1.50', apiKey: 'k' }, fetchImpl)).toBeUndefined();
  });

  test('returns nothing without an address or key', async ({ expect }) => {
    expect(await discoverWidgetId({ apiKey: 'k' }, ok)).toBeUndefined();
    expect(await discoverWidgetId({ address: '192.168.1.50' }, ok)).toBeUndefined();
  });
});
