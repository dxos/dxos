//
// Copyright 2026 DXOS.org
//

import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type Server, createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { OtelMetrics } from '../../src/extensions/otel/metrics';

// Smoke test for the metrics export path. Tagged `manual` so it never runs in CI.
//
// Against a local fake collector (no credentials needed) — asserts the payload:
//
//   DX_RUN_MANUAL_TESTS=1 moon run observability:test -- --run test/e2e/metrics-export.test.ts
//
// Against real SigNoz, add the endpoint and key; the test then exports there and only asserts
// that the flush resolved (there is nothing local left to inspect):
//
//   DX_RUN_MANUAL_TESTS=1 \
//   DX_OTEL_ENDPOINT=https://ingest.eu.signoz.cloud:443 \
//   DX_OTEL_HEADERS='signoz-ingestion-key:<YOUR_SIGNOZ_INGESTION_KEY>' \
//   DX_TELEMETRY_TAG=metrics-smoke-$(uuidgen) \
//     moon run observability:test -- --run test/e2e/metrics-export.test.ts
//
// Then find the run in SigNoz by filtering on `ctx.tag = <the DX_TELEMETRY_TAG value>`.

type CapturedPoint = { value: number; attributes: Record<string, unknown>; bucketCount?: number };
type CapturedMetric = {
  name: string;
  unit?: string;
  kind: 'sum' | 'gauge' | 'histogram' | 'unknown';
  temporality?: number;
  points: CapturedPoint[];
};

/** OTLP delta temporality, as encoded on the wire. */
const AGGREGATION_TEMPORALITY_DELTA = 1;

/** OTLP `KeyValue` attribute, as encoded on the wire. */
type OtlpAttribute = { key: string; value?: { stringValue?: string; intValue?: string } };

/** OTLP numeric data point, as encoded on the wire (the fields this test reads across sum/gauge/histogram). */
type OtlpDataPoint = {
  asInt?: string;
  asDouble?: number;
  count?: string;
  attributes?: OtlpAttribute[];
  bucketCounts?: unknown[];
};

const attributesOf = (raw: OtlpAttribute[] = []): Record<string, unknown> =>
  Object.fromEntries(raw.map((entry) => [entry.key, entry.value?.stringValue ?? entry.value?.intValue]));

describe('metrics export', { tags: ['manual'], timeout: 60_000 }, () => {
  const realEndpoint = process.env.DX_OTEL_ENDPOINT;
  const captured: CapturedMetric[] = [];
  let resourceAttributes: Record<string, unknown> = {};
  let server: Server | undefined;
  let endpoint: string;

  beforeAll(async () => {
    if (realEndpoint) {
      endpoint = realEndpoint;
      return;
    }

    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
          for (const resourceMetric of parsed.resourceMetrics ?? []) {
            resourceAttributes = attributesOf(resourceMetric.resource?.attributes);
            for (const scopeMetric of resourceMetric.scopeMetrics ?? []) {
              for (const metric of scopeMetric.metrics ?? []) {
                const body = metric.sum ?? metric.gauge ?? metric.histogram;
                captured.push({
                  name: metric.name,
                  unit: metric.unit,
                  kind: metric.sum ? 'sum' : metric.gauge ? 'gauge' : metric.histogram ? 'histogram' : 'unknown',
                  temporality: body?.aggregationTemporality,
                  points: (body?.dataPoints ?? []).map((point: OtlpDataPoint) => ({
                    value: point.asInt !== undefined ? Number(point.asInt) : (point.asDouble ?? Number(point.count)),
                    attributes: attributesOf(point.attributes),
                    bucketCount: point.bucketCounts?.length,
                  })),
                });
              }
            }
          }
        } catch (err) {
          console.error('failed to parse OTLP payload', err);
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{}');
      });
    });

    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${(server!.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  });

  test('every instrument kind reaches the collector', async () => {
    const metrics = new OtelMetrics({
      destinations: [{ endpoint, headers: parseHeaders(process.env.DX_OTEL_HEADERS) }],
      resource: defaultResource().merge(
        resourceFromAttributes({
          'service.name': 'metrics-smoke',
          'service.version': '0.0.0',
          'deployment.environment': 'local',
        }),
      ),
      getTags: () => ({ 'ctx.tag': process.env.DX_TELEMETRY_TAG ?? 'metrics-smoke' }),
    });

    metrics.increment('dxos.edge.ws.reconnect.count', 1, { reason: 'abnormal' }, { unit: '{reconnect}' });
    metrics.distribution('dxos.echo.sync.episode.duration', 42, undefined, { unit: 's' });

    let spaces = 3;
    metrics.observe('dxos.client.spaces.count', () => spaces, undefined, { unit: '{space}' });
    metrics.observe('dxos.client.runtime.memory.bytes', () => 1_234_567, { scope: 'shared-worker' }, { unit: 'By' });
    // Changed after registration: an observed gauge must report the collection-time value.
    spaces = 4;

    await metrics.flush();
    await metrics.close();

    if (realEndpoint) {
      console.log(`exported to ${realEndpoint}; find it in SigNoz via ctx.tag=${process.env.DX_TELEMETRY_TAG}`);
      return;
    }

    const byName = (name: string) => captured.find((metric) => metric.name === name);

    const counter = byName('dxos.edge.ws.reconnect.count');
    expect(counter?.kind).toEqual('sum');
    expect(counter?.unit).toEqual('{reconnect}');
    // The P1 fix: cumulative would make every client reload read as a counter reset.
    expect(counter?.temporality).toEqual(AGGREGATION_TEMPORALITY_DELTA);
    expect(counter?.points[0].attributes).toMatchObject({ 'reason': 'abnormal', 'ctx.tag': 'metrics-smoke' });

    const histogram = byName('dxos.echo.sync.episode.duration');
    expect(histogram?.kind).toEqual('histogram');
    expect(histogram?.unit).toEqual('s');
    // The registered view: 10 explicit boundaries, so 11 buckets including +Inf.
    expect(histogram?.points[0].bucketCount).toEqual(11);

    const gauge = byName('dxos.client.spaces.count');
    expect(gauge?.kind).toEqual('gauge');
    expect(gauge?.points[0].value).toEqual(4);

    const memory = byName('dxos.client.runtime.memory.bytes');
    expect(memory?.unit).toEqual('By');
    expect(memory?.points[0].attributes).toMatchObject({ scope: 'shared-worker' });

    // The P2 fix: session.id belongs on traces and logs, never on a metric's series identity.
    expect(resourceAttributes['service.name']).toEqual('metrics-smoke');
    expect(resourceAttributes['session.id']).toBeUndefined();
  });
});

const parseHeaders = (raw?: string): Record<string, string> =>
  Object.fromEntries(
    (raw ?? '')
      .split(';')
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.split(':');
        return [key.trim().toLowerCase(), rest.join(':').trim()];
      }),
  );
