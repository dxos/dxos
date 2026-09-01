//
// Copyright 2026 DXOS.org
//

import { SpanKind, SpanStatusCode, TraceFlags, context, trace } from '@opentelemetry/api';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider, InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { afterEach, describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import * as OtelSpanSink from './OtelSpanSink';

const defaultInit: OtelSpanSink.Init = {
  type: 'otel-traces-init',
  destinations: [{ endpoint: 'http://localhost:1', headers: {} }],
  resourceAttributes: { 'service.name': 'test-service', 'session.id': 'session-1' },
};

const makeProducer = () => {
  const records: OtelSpanSink.Span[] = [];
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ 'service.name': 'producer-only' }),
    spanProcessors: [new OtelSpanSink.PortSpanProcessor((record) => records.push(record))],
  });
  return { records, tracer: provider.getTracer('dxos-observability', '1.0.0'), provider };
};

describe('OtelSpanSink', () => {
  let sink: OtelSpanSink.Sink | undefined;

  afterEach(async () => {
    await sink?.close();
    sink = undefined;
  });

  const makeSink = () => {
    const exporter = new InMemorySpanExporter();
    sink = new OtelSpanSink.Sink(defaultInit, { exporter });
    return { sink, exporter };
  };

  test('round-trips an ended span through serialization into the export pipeline', async () => {
    const { records, tracer } = makeProducer();
    const { sink, exporter } = makeSink();

    const span = tracer.startSpan('sync.episode', { attributes: { 'space.id': 'space-1' } });
    span.addEvent('doc-loaded', { count: 3 });
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'timeout' });
    span.end();

    expect(records).toHaveLength(1);
    sink.append(records[0]);
    await sink.flush();

    const [exported] = exporter.getFinishedSpans();
    expect(exported.name).toBe('sync.episode');
    expect(exported.spanContext().traceId).toBe(records[0].traceId);
    expect(exported.spanContext().spanId).toBe(records[0].spanId);
    expect(exported.attributes['space.id']).toBe('space-1');
    expect(exported.status).toEqual({ code: SpanStatusCode.ERROR, message: 'timeout' });
    expect(exported.events).toHaveLength(1);
    expect(exported.events[0].name).toBe('doc-loaded');
    expect(hrTimeToMilliseconds(exported.duration)).toBeGreaterThanOrEqual(0);
    expect(exported.resource.attributes['service.name']).toBe('test-service');
    expect(exported.resource.attributes['session.id']).toBe('session-1');
    expect(exported.instrumentationScope).toEqual(expect.objectContaining({ name: 'dxos-observability' }));
  });

  test('preserves parent-child linkage across the port', async () => {
    const { records, tracer } = makeProducer();
    const { sink, exporter } = makeSink();

    const parent = tracer.startSpan('parent');
    const child = tracer.startSpan('child', {}, trace.setSpan(context.active(), parent));
    child.end();
    parent.end();

    expect(records).toHaveLength(2);
    for (const record of records) {
      sink.append(record);
    }
    await sink.flush();

    const exported = exporter.getFinishedSpans();
    const exportedChild = exported.find((span) => span.name === 'child');
    const exportedParent = exported.find((span) => span.name === 'parent');
    invariant(exportedChild && exportedParent);
    expect(exportedChild.parentSpanContext?.spanId).toBe(exportedParent.spanContext().spanId);
    expect(exportedChild.spanContext().traceId).toBe(exportedParent.spanContext().traceId);
  });

  test('unsampled spans are not forwarded', () => {
    const records: OtelSpanSink.Span[] = [];
    const processor = new OtelSpanSink.PortSpanProcessor((record) => records.push(record));
    const unsampled: ReadableSpan = {
      name: 'unsampled',
      kind: SpanKind.INTERNAL,
      spanContext: () => ({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), traceFlags: TraceFlags.NONE }),
      startTime: [0, 0],
      endTime: [1, 0],
      status: { code: SpanStatusCode.UNSET },
      attributes: {},
      links: [],
      events: [],
      duration: [1, 0],
      ended: true,
      resource: resourceFromAttributes({}),
      instrumentationScope: { name: 'test' },
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
    };

    processor.onEnd(unsampled);
    expect(records).toEqual([]);
  });
});
