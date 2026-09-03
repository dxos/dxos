//
// Copyright 2026 DXOS.org
//

import { trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { afterEach, describe, expect, test } from 'vitest';

import { TRACE_PROCESSOR } from '@dxos/tracing';

import { OtelTraces } from './traces-workerd';

describe('OtelTraces (workerd)', () => {
  afterEach(() => {
    TRACE_PROCESSOR.tracingBackend = undefined;
    trace.disable();
  });

  test('routes @dxos/tracing spans into the provider the host registered', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
    trace.setGlobalTracerProvider(provider);

    const traces = new OtelTraces({
      destinations: [],
      resource: resourceFromAttributes({ [ATTR_SERVICE_VERSION]: '1' }),
      getTags: () => ({}),
    });
    traces.start();

    const span = TRACE_PROCESSOR.tracingBackend!.startSpan({ name: 'edge.op' });
    span.end();
    await traces.flush();

    expect(exporter.getFinishedSpans().map((finished) => finished.name)).toEqual(['edge.op']);
    expect(span.spanContext?.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });
});
