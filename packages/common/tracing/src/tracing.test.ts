//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context, type TraceContextData } from '@dxos/context';

import { trace } from './api';
import { TRACE_PROCESSOR } from './trace-processor';
import type { RemoteSpan, StartSpanOptions, TracingBackend } from './tracing-types';

type SpanRecord = {
  options: StartSpanOptions;
  ended: boolean;
  endTime?: number;
  error?: unknown;
  spanContext: TraceContextData;
};

let spanCounter = 0;

const createMockBackend = (): { backend: TracingBackend; spans: SpanRecord[] } => {
  const spans: SpanRecord[] = [];

  const backend: TracingBackend = {
    startSpan: (options: StartSpanOptions): RemoteSpan => {
      const record: SpanRecord = {
        options,
        ended: false,
        spanContext: {
          traceparent: `00-aaaa0000aaaa0000aaaa0000aaaa0000-${String(++spanCounter).padStart(16, '0')}-01`,
        },
      };
      spans.push(record);
      return {
        end: (endTime?: number) => {
          record.ended = true;
          record.endTime = endTime;
        },
        setError: (err: unknown) => {
          record.error = err;
        },
        spanContext: record.spanContext,
      };
    },
  };

  return { backend, spans };
};

//
// Buffering backend tests
//

describe('buffering backend', () => {
  let savedBackend: typeof TRACE_PROCESSOR.tracingBackend;

  beforeEach(() => {
    savedBackend = TRACE_PROCESSOR.tracingBackend;
    TRACE_PROCESSOR.tracingBackend = undefined;
    spanCounter = 0;
  });

  afterEach(() => {
    TRACE_PROCESSOR.tracingBackend = savedBackend;
  });

  test('buffered spans are replayed into real backend on drain', async ({ expect }) => {
    const parentCtx = new Context();

    class Svc {
      @trace.span()
      async work(ctx: Context) {}
    }

    const svc = new Svc();
    await svc.work(parentCtx);

    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    expect(spans.length).toBeGreaterThanOrEqual(1);
    const workSpan = spans.find((span) => span.options.name === 'Svc.work');
    expect(workSpan).toBeDefined();
    expect(workSpan!.ended).toBe(true);
  });

  test('parent-child hierarchy is preserved across drain', ({ expect }) => {
    class Svc {
      @trace.span()
      async parent(ctx: Context) {
        await this.child(ctx);
      }

      @trace.span()
      async child(ctx: Context) {}
    }

    const svc = new Svc();
    void svc.parent(new Context());

    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const parentSpan = spans.find((span) => span.options.name === 'Svc.parent');
    const childSpan = spans.find((span) => span.options.name === 'Svc.child');
    expect(parentSpan).toBeDefined();
    expect(childSpan).toBeDefined();
    expect(childSpan!.options.parentContext?.traceparent).toBe(parentSpan!.spanContext.traceparent);
  });

  test('stale buffered parent IDs on in-flight contexts are translated post-drain', async ({ expect }) => {
    let capturedCtx: Context | undefined;

    class Svc {
      @trace.span()
      async setup(ctx: Context) {
        capturedCtx = ctx;
      }

      @trace.span()
      async laterWork(ctx: Context) {}
    }

    const svc = new Svc();
    await svc.setup(new Context());
    expect(capturedCtx).toBeDefined();

    // Now register the real backend.
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    // The capturedCtx carries a buffered-* traceparent from the setup span.
    // Calling laterWork with it should translate the stale buffered ID.
    await svc.laterWork(capturedCtx!);

    const setupSpan = spans.find((span) => span.options.name === 'Svc.setup');
    const laterSpan = spans.find((span) => span.options.name === 'Svc.laterWork');
    expect(setupSpan).toBeDefined();
    expect(laterSpan).toBeDefined();
    expect(laterSpan!.options.parentContext?.traceparent).toBe(setupSpan!.spanContext.traceparent);
  });

  test('errors and end() are replayed on drain', async ({ expect }) => {
    const testError = new Error('boom');

    class Svc {
      @trace.span()
      async failingWork(ctx: Context) {
        throw testError;
      }
    }

    const svc = new Svc();
    await svc.failingWork(new Context()).catch(() => {});

    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const failSpan = spans.find((span) => span.options.name === 'Svc.failingWork');
    expect(failSpan).toBeDefined();
    expect(failSpan!.error).toBe(testError);
    expect(failSpan!.ended).toBe(true);
  });

  test('still-open spans forward end() to real backend after drain', async ({ expect }) => {
    let resolveWork: () => void;
    const workPromise = new Promise<void>((resolve) => {
      resolveWork = resolve;
    });

    class Svc {
      @trace.span()
      async longWork(ctx: Context) {
        await workPromise;
      }
    }

    const svc = new Svc();
    const done = svc.longWork(new Context());

    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const longSpan = spans.find((span) => span.options.name === 'Svc.longWork');
    expect(longSpan).toBeDefined();
    expect(longSpan!.ended).toBe(false);

    resolveWork!();
    await done;

    expect(longSpan!.ended).toBe(true);
  });

  test('replayed spans preserve original start and end timestamps', async ({ expect }) => {
    const beforeStart = Date.now();

    class Svc {
      @trace.span()
      async work(ctx: Context) {}
    }

    const svc = new Svc();
    await svc.work(new Context());

    const afterEnd = Date.now();

    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const workSpan = spans.find((span) => span.options.name === 'Svc.work');
    expect(workSpan).toBeDefined();

    expect(workSpan!.options.startTime).toBeTypeOf('number');
    expect(workSpan!.options.startTime).toBeGreaterThanOrEqual(beforeStart);
    expect(workSpan!.options.startTime).toBeLessThanOrEqual(afterEnd);

    expect(workSpan!.endTime).toBeTypeOf('number');
    expect(workSpan!.endTime).toBeGreaterThanOrEqual(workSpan!.options.startTime!);
    expect(workSpan!.endTime).toBeLessThanOrEqual(afterEnd);
  });
});
