//
// Copyright 2026 DXOS.org
//

import { ROOT_CONTEXT, context, trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { afterEach, describe, test } from 'vitest';

import { TRACE_PROCESSOR } from '@dxos/tracing';

import type * as OtelSpanSink from './OtelSpanSink.ts';
import { activeTraceContext } from './trace-context.ts';
import { OtelTraces } from './traces.ts';

describe('OtelTraces', () => {
  afterEach(() => {
    context.disable();
    // `OtelTraces` registers a global tracer provider, and the API ignores a second registration while one is set.
    trace.disable();
  });

  test('keeps the active span across an await', async ({ expect }) => {
    const traces = new OtelTraces({
      destinations: [],
      resource: resourceFromAttributes({}),
      getTags: () => ({}),
      spanSink: { post: () => {} },
    });
    const spanContext = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: 1 };

    await context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(activeTraceContext()).toEqual({ traceId: spanContext.traceId, spanId: spanContext.spanId });
    });
    expect(activeTraceContext()).toBeUndefined();
    await traces.close();
  });

  test('keeps attributes set after the span started', async ({ expect }) => {
    const posted: OtelSpanSink.Span[] = [];
    const traces = new OtelTraces({
      destinations: [],
      resource: resourceFromAttributes({}),
      getTags: () => ({}),
      spanSink: { post: (span) => posted.push(span) },
    });
    const savedBackend = TRACE_PROCESSOR.tracingBackend;
    traces.start();
    try {
      const span = TRACE_PROCESSOR.tracingBackend.startSpan({ name: 'test.late', attributes: { 'ctx.early': 1 } });
      span.setAttributes?.({ 'ctx.outcome': 'synced' });
      span.end();

      expect(posted.find((record) => record.name === 'test.late')?.attributes).toMatchObject({
        'ctx.early': 1,
        'ctx.outcome': 'synced',
      });
    } finally {
      TRACE_PROCESSOR.tracingBackend = savedBackend;
      await traces.close();
    }
  });
});
