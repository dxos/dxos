//
// Copyright 2026 DXOS.org
//

import { AggregationTemporality, InMemoryMetricExporter, type MetricData } from '@opentelemetry/sdk-metrics';
import { afterEach, describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { OtelMetricsSink, type OtelMetricsSinkInit } from './metrics-sink';

const defaultInit: OtelMetricsSinkInit = {
  type: 'otel-metrics-init',
  destinations: [{ endpoint: 'http://localhost:1', headers: {} }],
  resourceAttributes: { 'service.name': 'test-service' },
  tags: { team: 'blue' },
};

describe('OtelMetricsSink', () => {
  let sink: OtelMetricsSink | undefined;

  afterEach(async () => {
    await sink?.close();
    sink = undefined;
  });

  const makeSink = (init: Partial<OtelMetricsSinkInit> = {}) => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA);
    sink = new OtelMetricsSink({ ...defaultInit, ...init }, { exporter });
    const metric = async (name: string): Promise<MetricData> => {
      invariant(sink);
      await sink.flush();
      const found = exporter
        .getMetrics()
        .flatMap((resourceMetrics) => resourceMetrics.scopeMetrics)
        .flatMap((scopeMetrics) => scopeMetrics.metrics)
        .find((data) => data.descriptor.name === name);
      invariant(found);
      return found;
    };
    return { sink, exporter, metric };
  };

  test('counter sums forwarded increments and merges tags', async () => {
    const { sink, metric } = makeSink();
    sink.append({ type: 'otel-metric', op: 'increment', name: 'test.count', value: 2, tags: { kind: 'a' } });
    sink.append({ type: 'otel-metric', op: 'increment', name: 'test.count', value: 3, tags: { kind: 'a' } });

    const data = await metric('test.count');
    expect(data.dataPoints).toHaveLength(1);
    expect(data.dataPoints[0].value).toBe(5);
    expect(data.dataPoints[0].attributes).toEqual({ team: 'blue', kind: 'a' });
  });

  test('gauge records the latest value with instrument metadata', async () => {
    const { sink, metric } = makeSink();
    sink.append({ type: 'otel-metric', op: 'gauge', name: 'test.lag', value: 7, meta: { unit: 'ms' } });
    sink.append({ type: 'otel-metric', op: 'gauge', name: 'test.lag', value: 11, meta: { unit: 'ms' } });

    const data = await metric('test.lag');
    expect(data.descriptor.unit).toBe('ms');
    expect(data.dataPoints[0].value).toBe(11);
  });

  test('distribution feeds a histogram', async () => {
    const { sink, metric } = makeSink();
    sink.append({ type: 'otel-metric', op: 'distribution', name: 'test.duration', value: 0.5 });
    sink.append({ type: 'otel-metric', op: 'distribution', name: 'test.duration', value: 1.5 });

    const data = await metric('test.duration');
    const point = data.dataPoints[0].value;
    invariant(typeof point === 'object' && point !== null && 'count' in point);
    expect(point.count).toBe(2);
    expect(point.sum).toBe(2);
  });

  test('setTags applies to later records only', async () => {
    const { sink, metric } = makeSink();
    sink.append({ type: 'otel-metric', op: 'increment', name: 'test.tagged', value: 1 });
    sink.setTags({ identity: 'alice' });
    sink.append({ type: 'otel-metric', op: 'increment', name: 'test.tagged', value: 1 });

    const data = await metric('test.tagged');
    const attributeSets = data.dataPoints.map((point) => point.attributes);
    expect(attributeSets).toContainEqual({ team: 'blue' });
    expect(attributeSets).toContainEqual({ team: 'blue', identity: 'alice' });
  });

  test('does not register on the local TRACE_PROCESSOR', async () => {
    const { sink, exporter } = makeSink();
    TRACE_PROCESSOR.remoteMetrics.increment('worker.local', 1);
    sink.append({ type: 'otel-metric', op: 'increment', name: 'forwarded', value: 1 });
    await sink.flush();

    const names = exporter
      .getMetrics()
      .flatMap((resourceMetrics) => resourceMetrics.scopeMetrics)
      .flatMap((scopeMetrics) => scopeMetrics.metrics)
      .map((data) => data.descriptor.name);
    expect(names).toEqual(['forwarded']);
  });

  test('resource carries the forwarded attributes', async () => {
    const { sink, exporter } = makeSink();
    sink.append({ type: 'otel-metric', op: 'increment', name: 'test.resource', value: 1 });
    await sink.flush();

    const [resourceMetrics] = exporter.getMetrics();
    expect(resourceMetrics.resource.attributes['service.name']).toBe('test-service');
    expect(resourceMetrics.resource.attributes['session.id']).toBeUndefined();
  });
});
