//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Client from './Client.ts';
import * as Sandbox from './Sandbox.ts';

describe('Client', () => {
  test('the API endpoint is the deployment origin over WebSocket', ({ expect }) => {
    expect(Client.apiEndpoint('https://cloudflareos.dxos.network')).toBe('wss://cloudflareos.dxos.network/api');
    expect(Client.apiEndpoint('http://localhost:8787/')).toBe('ws://localhost:8787/api');
  });

  test('a deployment URL round-trips through the hostname a connection stores', ({ expect }) => {
    expect(Client.urlFromHost(Client.hostFromUrl(Client.DEFAULT_URL))).toBe(Client.DEFAULT_URL);
  });

  test('the password hash is 32 bytes, deterministic, and salted by username', async ({ expect }) => {
    const first = await EffectEx.runPromise(Client.hashPassword('alice', 'secret'));
    const again = await EffectEx.runPromise(Client.hashPassword('alice', 'secret'));
    const other = await EffectEx.runPromise(Client.hashPassword('bob', 'secret'));
    expect(first).toHaveLength(32);
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });
});

describe('Sandbox', () => {
  test('the gadget page blocks the network and runs the gadget code after the prelude', ({ expect }) => {
    const html = Sandbox.gadgetHtml('console.log("hello")');
    expect(html).toContain("connect-src 'none'");
    const script = decodeURIComponent(/src="data:text\/javascript;charset=utf-8,([^"]+)"/.exec(html)?.[1] ?? '');
    expect(script.indexOf('newMessagePortRpcSession(port1)')).toBeGreaterThan(-1);
    expect(script.indexOf('console.log("hello")')).toBeGreaterThan(script.indexOf('newMessagePortRpcSession(port1)'));
  });
});
