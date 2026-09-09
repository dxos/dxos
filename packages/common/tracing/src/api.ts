//
// Copyright 2023 DXOS.org
//

import { Context, TRACE_SPAN_ATTRIBUTE } from '@dxos/context';
import { type MaybePromise } from '@dxos/util';

import { TRACE_PROCESSOR, sanitizeClassName } from './trace-processor';
import type { RemoteSpan } from './tracing-types';

/** localStorage key that switches the browser OTEL sampler from 30% to 100%. */
export const TRACE_ALL_KEY = 'dxos.debug.traceAll';

const mark = (name: string) => {
  performance.mark(name);
};

/**
 * Span attributes: a literal, or a function of the decorated call's own arguments for a value only
 * known per call (a run's trigger, a batch's size).
 */
export type SpanAttributeSource = Record<string, any> | ((...args: any[]) => Record<string, any>);

export type SpanOptions = {
  showInBrowserTimeline?: boolean;
  /** When false the span is not exported to remote OTLP collectors. Defaults to true. */
  showInRemoteTracing?: boolean;
  op?: string;
  attributes?: SpanAttributeSource;
};

/** Namespaces attribute keys under `ctx.` so they do not collide with OTel semantic conventions. */
const resolveAttributes = (attributes: SpanAttributeSource | undefined, args: any[]): Record<string, any> => {
  const resolved = typeof attributes === 'function' ? attributes(...args) : attributes;
  if (!resolved) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [key.startsWith('ctx.') ? key : `ctx.${key}`, value]),
  );
};

/**
 * Decorator that creates a span for the execution duration of the decorated method.
 * Calls the TracingBackend directly; no custom TracingSpan objects.
 */
const span =
  ({ showInBrowserTimeline = false, showInRemoteTracing = true, op, attributes }: SpanOptions = {}) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any) {
      const parentCtx = args[0] instanceof Context ? args[0] : null;
      const startTs = performance.now();

      const parentSpanContext = parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);

      const className = sanitizeClassName(target.constructor?.name ?? 'unknown');
      const spanName = `${className}.${propertyKey}`;

      const spanAttributes = resolveAttributes(attributes, args);

      const remoteSpan = showInRemoteTracing
        ? TRACE_PROCESSOR.tracingBackend?.startSpan({
            name: spanName,
            op: op ?? 'function',
            attributes: spanAttributes,
            parentContext: parentSpanContext,
          })
        : undefined;

      let callArgs = args;
      if (parentCtx) {
        const childCtx =
          remoteSpan?.spanContext != null
            ? parentCtx.derive({ attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext } })
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
  const spanName = `${className}.${params.methodName}`;

  if (params.showInBrowserTimeline) {
    manualSpanTimestamps.set(params.id, { name: spanName, startTs: performance.now() });
  }

  if (params.showInRemoteTracing === false || !TRACE_PROCESSOR.tracingBackend) {
    return params.parentCtx;
  }

  const parentSpanContext = params.parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);

  const spanAttributes = resolveAttributes(params.attributes, []);

  const remoteSpan = TRACE_PROCESSOR.tracingBackend.startSpan({
    name: spanName,
    op: params.op ?? 'function',
    attributes: spanAttributes,
    parentContext: parentSpanContext,
  });
  manualSpans.set(params.id, remoteSpan);

  if (params.parentCtx && remoteSpan.spanContext != null) {
    return params.parentCtx.derive({ attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext } });
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
  diagnostic,
  mark,
  span,
  spanStart,
  spanEnd,
  metrics: TRACE_PROCESSOR.remoteMetrics,
};
