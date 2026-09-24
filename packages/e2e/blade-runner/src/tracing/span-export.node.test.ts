//
// Copyright 2026 DXOS.org
//

import http from 'node:http';
import { type AddressInfo } from 'node:net';
import { describe, onTestFinished, test, vi } from 'vitest';

import { trace } from '@dxos/tracing';

import { SPAN_SERVICE_NAME, flushSpanExport, setSpanTags, startSpanExport } from './span-export.ts';

type ReceivedRequest = { url: string; authorization: string | undefined; body: string };

/** Stands in for PostHog's OTLP endpoint, recording every request it receives. */
const startReceiver = async (): Promise<{ origin: string; received: ReceivedRequest[] }> => {
  const received: ReceivedRequest[] = [];
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      received.push({ url: request.url ?? '', authorization: request.headers.authorization, body });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  onTestFinished(() => {
    server.close();
  });
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}`, received };
};

// The span dashboard reads the service name, the span name and attributes, and the tags below.
describe('span export', () => {
  test('exports spans with their end attributes and tags to the OTLP traces endpoint', async ({ expect }) => {
    const { origin, received } = await startReceiver();
    vi.stubEnv('DX_POSTHOG_API_KEY', 'phc_test');
    vi.stubEnv('DX_POSTHOG_API_HOST', origin);
    vi.stubEnv('GITHUB_RUN_ID', '4242');
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });

    await startSpanExport();
    setSpanTags({ edgeUrl: 'https://preview.dxos.network' });
    trace.spanStart({
      id: 'span-export-test',
      instance: new (class CollectionSynchronizer {})(),
      methodName: 'syncPeer',
      parentCtx: null,
      attributes: { trigger: 'initial' },
    });
    trace.spanEnd('span-export-test', { attributes: { outcome: 'synced' } });
    await flushSpanExport();

    const exported = received.filter((request) => request.url === '/i/v1/traces');
    expect(exported.length).toBeGreaterThan(0);
    expect(exported[0].authorization).toBe('Bearer phc_test');
    const body = exported.map((request) => request.body).join('\n');
    for (const expected of [
      SPAN_SERVICE_NAME,
      'CollectionSynchronizer.syncPeer',
      'ctx.trigger',
      'ctx.outcome',
      'edgeUrl',
      'ciRunId',
    ]) {
      expect(body).toContain(expected);
    }
  });
});
