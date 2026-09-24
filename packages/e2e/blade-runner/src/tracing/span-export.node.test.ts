//
// Copyright 2026 DXOS.org
//

import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, test, vi } from 'vitest';

import { invariant } from '@dxos/invariant';
import { trace } from '@dxos/tracing';

import { registerPerfettoTracer } from './perfetto-tracing.ts';
import {
  SPAN_SERVICE_NAME,
  flushSpanExport,
  getSpanExportBackend,
  onBeforeSpanFlush,
  setSpanTags,
  startSpanExport,
} from './span-export.ts';

type ReceivedRequest = { url: string; authorization: string | undefined; body: string };

/** Stands in for PostHog's OTLP endpoint, recording every request it receives. */
const startReceiver = async (): Promise<{ origin: string; received: ReceivedRequest[]; close: () => void }> => {
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
  const address = server.address();
  invariant(address !== null && typeof address === 'object', 'receiver did not bind');
  return { origin: `http://127.0.0.1:${address.port}`, received, close: () => server.close() };
};

const exportedBody = (received: ReceivedRequest[]): string =>
  received
    .filter((request) => request.url === '/i/v1/traces')
    .map((request) => request.body)
    .join('\n');

const synchronizer = new (class CollectionSynchronizer {})();

// The span dashboard reads the service name, the span name and attributes, and the tags below.
describe('span export', () => {
  let receiver: Awaited<ReturnType<typeof startReceiver>>;

  // Export is per process, so it is started once, in the order `runReplicant` starts it: the export first,
  // then `ReplicantEnvImpl` installs the perfetto tracer.
  beforeAll(async () => {
    receiver = await startReceiver();
    vi.stubEnv('DX_POSTHOG_API_KEY', 'phc_test');
    vi.stubEnv('DX_POSTHOG_API_HOST', receiver.origin);
    vi.stubEnv('GITHUB_RUN_ID', '4242');
    await startSpanExport();
    registerPerfettoTracer(getSpanExportBackend());
    setSpanTags({ edgeUrl: 'https://preview.dxos.network' });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    receiver.close();
  });

  beforeEach(() => {
    receiver.received.length = 0;
  });

  test('exports spans with their end attributes and tags through the perfetto tracer', async ({ expect }) => {
    trace.spanStart({
      id: 'span-export-ended',
      instance: synchronizer,
      methodName: 'syncPeer',
      parentCtx: null,
      attributes: { trigger: 'initial' },
    });
    trace.spanEnd('span-export-ended', { attributes: { outcome: 'synced' } });
    await flushSpanExport();

    const exported = receiver.received.filter((request) => request.url === '/i/v1/traces');
    expect(exported.length).toBeGreaterThan(0);
    expect(exported[0].authorization).toBe('Bearer phc_test');
    const body = exportedBody(receiver.received);
    for (const expected of [
      SPAN_SERVICE_NAME,
      'CollectionSynchronizer.syncPeer',
      'ctx.trigger',
      'ctx.outcome',
      'synced',
      'edgeUrl',
      'ciRunId',
    ]) {
      expect(body).toContain(expected);
    }
  });

  test('lets owners end their open spans before the final flush', async ({ expect }) => {
    trace.spanStart({
      id: 'span-export-open',
      instance: synchronizer,
      methodName: 'syncPeer',
      parentCtx: null,
      attributes: { trigger: 'remote' },
    });
    onBeforeSpanFlush(async () => {
      trace.spanEnd('span-export-open', { attributes: { outcome: 'closed' } });
    });
    await flushSpanExport();

    const body = exportedBody(receiver.received);
    expect(body).toContain('remote');
    expect(body).toContain('closed');
  });
});
