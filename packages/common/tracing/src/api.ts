//
// Copyright 2023 DXOS.org
//

import { Context, TRACE_LINK_ATTRIBUTE, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';
import { type MaybePromise } from '@dxos/util';

import { TRACE_PROCESSOR, sanitizeClassName } from './trace-processor';
import type { RemoteSpan } from './tracing-types';

/** localStorage key that switches the browser OTEL sampler from 30% to 100%. */
export const TRACE_ALL_KEY = 'dxos.debug.traceAll';

const mark = (name: string) => {
  performance.mark(name);
};

export type SpanOptions = {
  /**
   * Explicit span name (`'ClassName.methodName'`), resolved at decoration time.
   * REQUIRED for remotely-exported spans (lint-enforced): the runtime fallback derives
   * names from `constructor.name`, which minified production builds mangle into
   * unreadable identifiers (`Lb.syncPeer`). A string literal survives any bundler and
   * is greppable from a SigNoz span name straight back to the source.
   */
  name?: string;
  showInBrowserTimeline?: boolean;
  /** When false the span is not exported to remote OTLP collectors. Defaults to true. */
  showInRemoteTracing?: boolean;
  op?: string;
  attributes?: Record<string, any>;
};

/**
 * Decorator that creates a span for the execution duration of the decorated method.
 * Calls the TracingBackend directly; no custom TracingSpan objects.
 */
const span =
  ({ name, showInBrowserTimeline = false, showInRemoteTracing = true, op, attributes }: SpanOptions = {}) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any) {
      const parentCtx = args[0] instanceof Context ? args[0] : null;
      const startTs = performance.now();

      const parentSpanContext = parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);
      const linkContext = parentCtx?.getAttribute(TRACE_LINK_ATTRIBUTE) as TraceContextData | undefined;

      const className = sanitizeClassName(target.constructor?.name ?? 'unknown');
      const spanName = name ?? `${className}.${propertyKey}`;

      const spanAttributes: Record<string, any> = {};
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          spanAttributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
        }
      }

      const remoteSpan = showInRemoteTracing
        ? TRACE_PROCESSOR.tracingBackend?.startSpan({
            name: spanName,
            op: op ?? 'function',
            attributes: spanAttributes,
            parentContext: parentSpanContext,
            links: linkContext ? [linkContext] : undefined,
          })
        : undefined;

      let callArgs = args;
      if (parentCtx) {
        const childCtx =
          remoteSpan?.spanContext != null
            ? parentCtx.derive({
                // The link is consumed by this (root) span; descendants parent on it normally.
                attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext, [TRACE_LINK_ATTRIBUTE]: undefined },
              })
            : parentCtx.derive();
        callArgs = [childCtx, ...args.slice(1)];
      }

      try {
        return await method.apply(this, callArgs);
      } catch (err) {
        remoteSpan?.setError?.(err);
        throw err;
      } finally {
        remoteSpan?.end();
        if (showInBrowserTimeline && typeof globalThis?.performance?.measure === 'function') {
          performance.measure(spanName, { start: startTs, end: performance.now() });
        }
      }
    };
  };

const manualSpans = new Map<string, RemoteSpan>();
const manualSpanTimestamps = new Map<string, { name: string; startTs: number }>();

export type ManualSpanParams = {
  id: string;
  instance: any;
  methodName: string;
  parentCtx: Context | null;
  /** Explicit span name; see {@link SpanOptions.name}. Falls back to `Class.methodName`. */
  name?: string;
  showInBrowserTimeline?: boolean;
  showInRemoteTracing?: boolean;
  op?: string;
  attributes?: Record<string, any>;
};

/**
 * Creates a span that must be ended manually.
 *
 * Returns a child Context that carries the new span's `TRACE_SPAN_ATTRIBUTE`.
 * Callers should use the returned ctx for downstream work so that nested
 * `@trace.span` methods and RPC calls inherit this span as their parent
 * and land in the same trace (rather than starting a new root).
 *
 * When the new span cannot be created (duplicate id, no backend, or
 * `showInRemoteTracing: false`), the parentCtx is returned unchanged.
 */
const spanStart = (params: ManualSpanParams): Context | null => {
  if (manualSpans.has(params.id) || manualSpanTimestamps.has(params.id)) {
    return params.parentCtx;
  }

  const className = sanitizeClassName(params.instance?.constructor?.name ?? 'unknown');
  const spanName = params.name ?? `${className}.${params.methodName}`;

  if (params.showInBrowserTimeline) {
    manualSpanTimestamps.set(params.id, { name: spanName, startTs: performance.now() });
  }

  if (params.showInRemoteTracing === false || !TRACE_PROCESSOR.tracingBackend) {
    return params.parentCtx;
  }

  const parentSpanContext = params.parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);
  const linkContext = params.parentCtx?.getAttribute(TRACE_LINK_ATTRIBUTE) as TraceContextData | undefined;

  const spanAttributes: Record<string, any> = {};
  if (params.attributes) {
    for (const [key, value] of Object.entries(params.attributes)) {
      spanAttributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
    }
  }

  const remoteSpan = TRACE_PROCESSOR.tracingBackend.startSpan({
    name: spanName,
    op: params.op ?? 'function',
    attributes: spanAttributes,
    parentContext: parentSpanContext,
    links: linkContext ? [linkContext] : undefined,
  });
  manualSpans.set(params.id, remoteSpan);

  if (params.parentCtx && remoteSpan.spanContext != null) {
    return params.parentCtx.derive({
      // The link is consumed by this (root) span; descendants parent on it normally.
      attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext, [TRACE_LINK_ATTRIBUTE]: undefined },
    });
  }
  return params.parentCtx;
};

/**
 * Ends a span that was started manually.
 */
const spanEnd = (id: string) => {
  const remoteSpan = manualSpans.get(id);
  if (remoteSpan) {
    remoteSpan.end();
    manualSpans.delete(id);
  }

  const timestamps = manualSpanTimestamps.get(id);
  if (timestamps && typeof globalThis?.performance?.measure === 'function') {
    performance.measure(timestamps.name, { start: timestamps.startTs, end: performance.now() });
    manualSpanTimestamps.delete(id);
  }
};

export type AddLinkOptions = {};

const addLink = (parent: any, child: any, opts: AddLinkOptions = {}) => {
  TRACE_PROCESSOR.addLink(parent, child, opts);
};

/**
 * Detach recurring/background work from the caller's trace.
 *
 * Returns a derived Context whose current span (if any) is demoted from parent to
 * OTEL span LINK: the next `@trace.span` / `spanStart` under the returned ctx starts
 * a NEW root trace carrying a link back to the spawning span. Use when handing a ctx
 * to polling loops, scheduled reconnects, or any work that outlives the operation
 * that spawned it — parenting such work would accrete unrelated activity onto the
 * spawning trace for the context's lifetime (the umbrella-parent drift / mega-trace
 * failure mode; see docs/design/tracing-improvement-spec.md target policy #1-2).
 */
const detach = (ctx: Context): Context => {
  const spanContext = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE) as TraceContextData | undefined;
  if (!spanContext) {
    return ctx;
  }
  return ctx.derive({
    attributes: { [TRACE_SPAN_ATTRIBUTE]: undefined, [TRACE_LINK_ATTRIBUTE]: spanContext },
  });
};

export type TraceDiagnosticProps<T> = {
  /** Unique ID. */
  id: string;

  /**
   * Human-readable name.
   * @defaults Defaults to `id`
   */
  name?: string;

  /** Function that will be called to fetch the diagnostic data. */
  fetch: () => MaybePromise<T>;
};

export interface TraceDiagnostic {
  id: string;
  unregister(): void;
}

/**
 * Register a diagnostic that could be queried.
 */
const diagnostic = <T>(params: TraceDiagnosticProps<T>): TraceDiagnostic => {
  return TRACE_PROCESSOR.diagnostics.registerDiagnostic(params);
};

export const trace = {
  addLink,
  detach,
  diagnostic,
  mark,
  span,
  spanStart,
  spanEnd,
  metrics: TRACE_PROCESSOR.remoteMetrics,
};
