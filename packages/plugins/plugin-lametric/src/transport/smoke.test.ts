//
// Copyright 2026 DXOS.org
//

import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { toFrames } from '#render';

import { type FetchLike, selectTransport } from './LaMetricTransport';

type Captured = { method?: string; url?: string; headers: Record<string, unknown>; body: string };

/** The real platform fetch, so the request is assembled and parsed exactly as the device sees it. */
const nodeFetch: FetchLike = async (url, init) => {
  const response = await fetch(url, { method: init.method, headers: init.headers, body: init.body });
  return { ok: response.ok, status: response.status, json: () => response.json() };
};

describe('transport against a stand-in device', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let captured: Captured;

  beforeEach(async () => {
    captured = { headers: {}, body: '' };
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        captured = {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: Buffer.concat(chunks).toString(),
        };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{"success":{}}');
      });
    });

    // Awaiting `listening` rather than sleeping: a fixed delay is a flake on a loaded runner.
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('sends the widget update the device expects', async ({ expect }) => {
    const transport = selectTransport(
      { address: '127.0.0.1', scheme: 'http', port, apiKey: 'device-key', widgetId: 'diy-uuid' },
      nodeFetch,
    );

    expect(transport?.kind).toBe('local');
    await transport!.push({ frames: toFrames([{ kind: 'stat', title: 'Objects', value: '42' }]) });

    expect(captured.method).toBe('POST');
    expect(captured.url).toBe('/api/v2/widget/update/com.lametric.diy.devwidget/diy-uuid');
    expect(captured.headers.authorization).toBe(`Basic ${btoa('dev:device-key')}`);
    expect(captured.headers['content-type']).toBe('application/json');
    expect(JSON.parse(captured.body)).toEqual({ frames: [{ text: '42 obj', index: 0 }] });
  });

  test('surfaces a rejection from the device', async ({ expect }) => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = createServer((_request, response) => {
      response.writeHead(401);
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));

    const transport = selectTransport(
      { address: '127.0.0.1', scheme: 'http', port, apiKey: 'wrong', widgetId: 'diy-uuid' },
      nodeFetch,
    );
    await expect(transport!.push({ frames: [] })).rejects.toThrow('401');
  });
});
