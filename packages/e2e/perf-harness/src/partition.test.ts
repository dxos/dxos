//
// Copyright 2026 DXOS.org
//

import { request } from 'node:http';
import { createServer } from 'node:net';
import { describe, test } from 'vitest';

import { insidePartition, startPartitionProxy } from './partition.ts';

/** Sends one request through the proxy and resolves with the status it answered. */
const through = (port: number, options: { method: string; path: string; host?: string }): Promise<number> =>
  new Promise((resolve, reject) => {
    const outgoing = request({ host: '127.0.0.1', port, method: options.method, path: options.path });
    if (options.host) {
      outgoing.setHeader('host', options.host);
    }
    outgoing.once('connect', (response, socket) => {
      socket.destroy();
      resolve(response.statusCode ?? 0);
    });
    outgoing.once('response', (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    outgoing.once('error', reject);
    outgoing.end();
  });

describe('network partition', () => {
  test('refuses and records every request, tunnelled or plain', async ({ expect }) => {
    const proxy = await startPartitionProxy();
    try {
      expect(await through(proxy.port, { method: 'CONNECT', path: 'dxos.network:443' })).toBe(403);
      expect(await through(proxy.port, { method: 'GET', path: 'http://telemetry.example/v1/logs' })).toBe(403);
      expect(proxy.denied()).toEqual([
        { host: 'dxos.network', port: 443, method: 'CONNECT' },
        { host: 'telemetry.example', port: 80, method: 'GET' },
      ]);
    } finally {
      await proxy.close();
    }
  });

  test('tunnels to an allowed host only, and refuses plain requests even to it', async ({ expect }) => {
    const upstream = createServer((socket) => socket.end());
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const address = upstream.address();
    const upstreamPort = address && typeof address !== 'string' ? address.port : 0;
    const proxy = await startPartitionProxy({ allow: ['127.0.0.1'] });
    try {
      expect(await through(proxy.port, { method: 'CONNECT', path: `127.0.0.1:${upstreamPort}` })).toBe(200);
      expect(await through(proxy.port, { method: 'CONNECT', path: 'dxos.network:443' })).toBe(403);
      expect(await through(proxy.port, { method: 'GET', path: 'http://127.0.0.1/' })).toBe(403);
      expect(proxy.tunnelled()).toEqual([{ host: '127.0.0.1', port: upstreamPort, method: 'CONNECT' }]);
      expect(proxy.denied().map(({ host }) => host)).toEqual(['dxos.network', '127.0.0.1']);
    } finally {
      await proxy.close();
      upstream.close();
    }
  });

  test('only loopback and allowed hosts count as inside the partition', ({ expect }) => {
    expect(insidePartition('http://127.0.0.1:4461/assets/main.js')).toBe(true);
    expect(insidePartition('ws://localhost:9333/devtools')).toBe(true);
    expect(insidePartition('data:text/plain,x')).toBe(true);
    expect(insidePartition('wss://dxos.network/edge')).toBe(false);
    expect(insidePartition('https://192.168.1.10/')).toBe(false);
    expect(insidePartition('wss://dev.dxos.network/edge', ['dev.dxos.network'])).toBe(true);
  });
});
