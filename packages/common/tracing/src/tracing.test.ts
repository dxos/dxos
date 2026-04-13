//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context, Resource, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';

import { trace } from './api';
import { TRACE_PROCESSOR } from './trace-processor';
import type { RemoteSpan, StartSpanOptions, TracingBackend } from './tracing-types';

const FeedStoreResource = Symbol.for('FeedStore');

@trace.resource({ annotation: FeedStoreResource })
class FeedStore {
  private readonly _storage: any;

  private readonly _feeds = new Map<string, Feed>();

  @trace.info()
  get dataStore() {
    return this._storage.type;
  }

  @trace.span()
  async openFeed(ctx: Context): Promise<Feed> {
    const feed = new Feed();
    feed.key = Math.random().toString(36).substring(2, 15);
    this._feeds.set(feed.key, feed);
    trace.addLink(this, feed, {});

    await feed.open(ctx);
    return feed;
  }
}

@trace.resource()
class Feed {
  @trace.info()
  key!: string;

  @trace.span()
  async open(ctx: Context): Promise<void> {}

  @trace.span()
  async close(): Promise<void> {
    throw new Error('Not implemented');
  }
}

describe('tracing', () => {
  beforeEach(() => {
    TRACE_PROCESSOR.resources.clear();
  });

  test('feed store tracing', async () => {
    const store = new FeedStore();
    const feed1 = await store.openFeed(new Context());
    const feed2 = await store.openFeed(new Context());

    await feed2.close().catch(() => {});

    expect([...TRACE_PROCESSOR.resources.values()].map((r) => r.instance.deref())).to.deep.eq([store, feed1, feed2]);
  });

  test('findByAnnotation', async () => {
    const store = new FeedStore();
    expect(TRACE_PROCESSOR.findResourcesByAnnotation(FeedStoreResource)[0].instance.deref()).to.eq(store);
  });
});

//
// Lifecycle span tests
//

type SpanRecord = {
  options: StartSpanOptions;
  ended: boolean;
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
        end: () => {
          record.ended = true;
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

describe('lifecycle span', () => {
  let savedBackend: typeof TRACE_PROCESSOR.tracingBackend;

  beforeEach(() => {
    TRACE_PROCESSOR.resources.clear();
    savedBackend = TRACE_PROCESSOR.tracingBackend;
    spanCounter = 0;
  });

  afterEach(() => {
    TRACE_PROCESSOR.tracingBackend = savedBackend;
  });

  test('lifecycle span is started on open and ended on close', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      protected override async _open(_ctx: Context) {}
      protected override async _close(_ctx: Context) {}
    }

    const resource = new TestResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'TestResource.lifecycle');
    expect(lifecycleSpan).toBeDefined();
    expect(lifecycleSpan!.options.op).toBe('lifecycle');
    expect(lifecycleSpan!.ended).toBe(false);

    await resource.close();
    expect(lifecycleSpan!.ended).toBe(true);
  });

  test('this._ctx carries lifecycle span trace context', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    let capturedCtxTraceData: TraceContextData | undefined;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      protected override async _open(_ctx: Context) {
        capturedCtxTraceData = this._ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
      }
    }

    const resource = new TestResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'TestResource.lifecycle');
    expect(capturedCtxTraceData).toBeDefined();
    expect(capturedCtxTraceData!.traceparent).toBe(lifecycleSpan!.spanContext.traceparent);

    await resource.close();
  });

  test('@trace.span() inside _open is child of lifecycle span', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      @trace.span()
      protected override async _open(_ctx: Context) {}
    }

    const resource = new TestResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'TestResource.lifecycle');
    const openSpan = spans.find((span) => span.options.name === 'TestResource._open');
    expect(lifecycleSpan).toBeDefined();
    expect(openSpan).toBeDefined();
    expect(openSpan!.options.parentContext?.traceparent).toBe(lifecycleSpan!.spanContext.traceparent);

    await resource.close();
  });

  test('subscriptions use lifecycle context, not _open context', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    let subscriptionParentTrace: TraceContextData | undefined;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      @trace.span()
      protected override async _open(_ctx: Context) {
        // Simulate a subscription callback using this._ctx.
        subscriptionParentTrace = this._ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
      }
    }

    const resource = new TestResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'TestResource.lifecycle');
    const openSpan = spans.find((span) => span.options.name === 'TestResource._open');

    expect(subscriptionParentTrace!.traceparent).toBe(lifecycleSpan!.spanContext.traceparent);
    expect(subscriptionParentTrace!.traceparent).not.toBe(openSpan!.spanContext.traceparent);

    await resource.close();
  });

  test('nested resource lifecycles are nested', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource({ lifecycle: true })
    class ChildResource extends Resource {
      protected override async _open(_ctx: Context) {}
    }

    @trace.resource({ lifecycle: true })
    class ParentResource extends Resource {
      child = new ChildResource();

      @trace.span()
      protected override async _open(ctx: Context) {
        await this.child.open(ctx);
      }

      protected override async _close(_ctx: Context) {
        await this.child.close();
      }
    }

    const parent = new ParentResource();
    await parent.open();

    const parentLifecycle = spans.find((span) => span.options.name === 'ParentResource.lifecycle');
    const parentOpen = spans.find((span) => span.options.name === 'ParentResource._open');
    const childLifecycle = spans.find((span) => span.options.name === 'ChildResource.lifecycle');

    expect(parentLifecycle).toBeDefined();
    expect(parentOpen).toBeDefined();
    expect(childLifecycle).toBeDefined();

    // Parent._open is child of Parent.lifecycle.
    expect(parentOpen!.options.parentContext?.traceparent).toBe(parentLifecycle!.spanContext.traceparent);
    // Child.lifecycle is child of Parent._open (direct async call).
    expect(childLifecycle!.options.parentContext?.traceparent).toBe(parentOpen!.spanContext.traceparent);

    await parent.close();
    expect(childLifecycle!.ended).toBe(true);
    expect(parentLifecycle!.ended).toBe(true);
  });

  test('lifecycle requires Resource base class', ({ expect }) => {
    expect(() => {
      @trace.resource({ lifecycle: true })
      class NotAResource {
        async open() {}
        async close() {}
      }
      void NotAResource;
    }).toThrow(/requires.*to extend Resource/);
  });

  test('no lifecycle span without opt-in', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource()
    class PlainResource extends Resource {
      @trace.span()
      protected override async _open(_ctx: Context) {}
    }

    const resource = new PlainResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'PlainResource.lifecycle');
    expect(lifecycleSpan).toBeUndefined();

    await resource.close();
  });

  test('lifecycle span records error when _open throws', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const openError = new Error('open failed');

    @trace.resource({ lifecycle: true })
    class FailingResource extends Resource {
      protected override async _open(_ctx: Context) {
        throw openError;
      }
    }

    const resource = new FailingResource();
    await expect(resource.open()).rejects.toThrow('open failed');

    const lifecycleSpan = spans.find((span) => span.options.name === 'FailingResource.lifecycle');
    expect(lifecycleSpan).toBeDefined();
    expect(lifecycleSpan!.error).toBe(openError);
    expect(lifecycleSpan!.ended).toBe(true);
  });

  test('double open does not start a second lifecycle span', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      protected override async _open(_ctx: Context) {}
    }

    const resource = new TestResource();
    await resource.open();
    await resource.open();

    const lifecycleSpans = spans.filter((span) => span.options.name === 'TestResource.lifecycle');
    expect(lifecycleSpans).toHaveLength(1);

    await resource.close();
  });

  test('lifecycle span works without tracing backend', async () => {
    TRACE_PROCESSOR.tracingBackend = undefined;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      protected override async _open(_ctx: Context) {}
    }

    const resource = new TestResource();
    await resource.open();
    await resource.close();
  });

  test('caller trace context is parent of lifecycle span', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    @trace.resource({ lifecycle: true })
    class TestResource extends Resource {
      protected override async _open(_ctx: Context) {}
    }

    const callerTraceData: TraceContextData = {
      traceparent: '00-bbbb0000bbbb0000bbbb0000bbbb0000-cccc0000cccc0000-01',
    };
    const callerCtx = new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: callerTraceData } });

    const resource = new TestResource();
    await resource.open(callerCtx);

    const lifecycleSpan = spans.find((span) => span.options.name === 'TestResource.lifecycle');
    expect(lifecycleSpan!.options.parentContext?.traceparent).toBe(callerTraceData.traceparent);

    await resource.close();
  });

  test('lifecycle span records error and ends when _close throws', async ({ expect }) => {
    const { backend, spans } = createMockBackend();
    TRACE_PROCESSOR.tracingBackend = backend;

    const closeError = new Error('close failed');

    @trace.resource({ lifecycle: true })
    class FailingCloseResource extends Resource {
      protected override async _open(_ctx: Context) {}

      protected override async _close(_ctx: Context) {
        throw closeError;
      }
    }

    const resource = new FailingCloseResource();
    await resource.open();

    const lifecycleSpan = spans.find((span) => span.options.name === 'FailingCloseResource.lifecycle');
    expect(lifecycleSpan).toBeDefined();
    expect(lifecycleSpan!.ended).toBe(false);

    await expect(resource.close()).rejects.toThrow('close failed');

    expect(lifecycleSpan!.error).toBe(closeError);
    expect(lifecycleSpan!.ended).toBe(true);
  });
});
