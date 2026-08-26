//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';

import { trace } from './api';
import { BufferingTracingBackend, MAX_BUFFERED_SPANS } from './buffering-backend';
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
// Manual span tests
//

describe('manual spans', () => {
  let savedBackend: typeof TRACE_PROCESSOR.tracingBackend;

  beforeEach(() => {
    savedBackend = TRACE_PROCESSOR.tracingBackend;
    spanCounter = 0;
  });

  afterEach(() => {
    TRACE_PROCESSOR.tracingBackend = savedBackend;
  });

  test('spanStart nests under the parent context and spanEnd ends the span', ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const parentTrace: TraceContextData = {
      traceparent: '00-bbbb0000bbbb0000bbbb0000bbbb0000-cccc0000cccc0000-01',
    };
    const parentCtx = new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: parentTrace } });

    const childCtx = trace.spanStart({ id: 'op-1', instance: {}, methodName: 'work', parentCtx });

    const span = spans.find((record) => record.options.name.endsWith('.work'));
    expect(span).toBeDefined();
    expect(span!.options.parentContext?.traceparent).toBe(parentTrace.traceparent);

    // The returned ctx carries the new span's trace context so downstream spans nest under it.
    expect(childCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE)?.traceparent).toBe(span!.spanContext.traceparent);

    expect(span!.ended).toBe(false);
    trace.spanEnd('op-1');
    expect(span!.ended).toBe(true);
  });

  test('spanStart with showInRemoteTracing:false creates no remote span and returns parentCtx unchanged', ({
    expect,
  }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const parentCtx = new Context();
    const result = trace.spanStart({
      id: 'op-2',
      instance: {},
      methodName: 'work',
      parentCtx,
      showInRemoteTracing: false,
    });

    expect(result).toBe(parentCtx);
    expect(spans.find((record) => record.options.name.endsWith('.work'))).toBeUndefined();
  });

  test('duplicate spanStart id returns parentCtx without starting a second span', ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const parentCtx = new Context();
    trace.spanStart({ id: 'op-3', instance: {}, methodName: 'work', parentCtx });
    const secondResult = trace.spanStart({ id: 'op-3', instance: {}, methodName: 'work', parentCtx });

    expect(secondResult).toBe(parentCtx);
    expect(spans.filter((record) => record.options.name.endsWith('.work'))).toHaveLength(1);

    trace.spanEnd('op-3');
  });
});

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

//
// Ring buffer bound
//

describe('buffering backend bound', () => {
  test('buffers up to the cap without dropping', ({ expect }) => {
    const buffering = new BufferingTracingBackend();
    for (let i = 0; i < MAX_BUFFERED_SPANS; i++) {
      buffering.startSpan({ name: `span-${i}` });
    }

    expect(buffering.size).to.eq(MAX_BUFFERED_SPANS);
    expect(buffering.dropped).to.eq(0);
  });

  test('drops the oldest spans past the cap instead of growing without bound', ({ expect }) => {
    const buffering = new BufferingTracingBackend();
    const overflow = 5;
    for (let i = 0; i < MAX_BUFFERED_SPANS + overflow; i++) {
      buffering.startSpan({ name: `span-${i}` });
    }

    expect(buffering.size).to.eq(MAX_BUFFERED_SPANS);
    expect(buffering.dropped).to.eq(overflow);

    // The surviving window is the newest `MAX_BUFFERED_SPANS`, still in FIFO order.
    const { backend, spans } = createMockBackend();
    buffering.drain(backend);

    expect(spans).to.have.length(MAX_BUFFERED_SPANS);
    expect(spans[0].options.name).to.eq(`span-${overflow}`);
    expect(spans[spans.length - 1].options.name).to.eq(`span-${MAX_BUFFERED_SPANS + overflow - 1}`);
  });

  test('drain resets the buffer so a second drain replays nothing', ({ expect }) => {
    const buffering = new BufferingTracingBackend();
    buffering.startSpan({ name: 'first' });

    const first = createMockBackend();
    buffering.drain(first.backend);
    expect(first.spans).to.have.length(1);
    expect(buffering.size).to.eq(0);

    const second = createMockBackend();
    buffering.drain(second.backend);
    expect(second.spans).to.have.length(0);
  });

  test('a span whose buffered parent was dropped is replayed as a root span', ({ expect }) => {
    const buffering = new BufferingTracingBackend();
    const parent = buffering.startSpan({ name: 'parent' });
    // Overflow by exactly one so the parent — the oldest — is the span evicted.
    for (let i = 0; i < MAX_BUFFERED_SPANS; i++) {
      buffering.startSpan({ name: `child-${i}`, parentContext: parent.spanContext });
    }

    expect(buffering.dropped).to.eq(1);

    const { backend, spans } = createMockBackend();
    buffering.drain(backend);

    expect(spans).to.have.length(MAX_BUFFERED_SPANS);
    expect(spans.every((span) => span.options.name !== 'parent')).to.be.true;
    // No replayed span carries the evicted parent's unparseable synthetic traceparent.
    expect(spans[0].options.parentContext).to.be.undefined;
  });

  test('clear discards buffered spans and the dropped count', ({ expect }) => {
    const buffering = new BufferingTracingBackend();
    for (let i = 0; i < MAX_BUFFERED_SPANS + 1; i++) {
      buffering.startSpan({ name: `span-${i}` });
    }
    expect(buffering.dropped).to.eq(1);

    buffering.clear();

    expect(buffering.size).to.eq(0);
    expect(buffering.dropped).to.eq(0);

    const { backend, spans } = createMockBackend();
    buffering.drain(backend);
    expect(spans).to.have.length(0);
  });
});
