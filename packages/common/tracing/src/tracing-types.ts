//
// Copyright 2024 DXOS.org
//

import { type TraceContextData } from '@dxos/context';

/**
 * Opaque span handle returned by {@link TracingBackend.startSpan}.
 *
 * The `spanContext` field carries W3C trace context strings that are stored
 * on the DXOS {@link Context} via `TRACE_SPAN_ATTRIBUTE`. Because these are
 * plain strings (not live runtime objects), they survive after the span ends
 * and across serialization boundaries.
 */
export type RemoteSpan = {
  /** Signal that the span has ended. Must be called exactly once. */
  end: () => void;

  /** Record an error on the span (e.g., OTEL `span.recordException` + `setStatus`). */
  setError?: (err: unknown) => void;

  /**
   * W3C trace context identifying this span.
   *
   * Stored on the DXOS `Context` attribute (`TRACE_SPAN_ATTRIBUTE`) so that
   * child `@trace.span()` methods can read it and pass it as
   * {@link StartSpanOptions.parentContext} to create properly-parented spans.
   */
  spanContext?: TraceContextData;
};

/**
 * Options passed to {@link TracingBackend.startSpan}.
 */
export type StartSpanOptions = {
  /** Human-readable span name, typically `ClassName.methodName`. */
  name: string;
  /** Span category (e.g., `'function'`, `'rpc'`). */
  op?: string;
  /** Key-value attributes attached to the span. */
  attributes?: Record<string, any>;

  /**
   * W3C trace context of the parent span.
   *
   * The backend extracts the trace/span IDs from these strings to establish
   * parent-child relationships. When `undefined`, the backend creates a root span.
   */
  parentContext?: TraceContextData;
};

/**
 * Backend-agnostic tracing interface implemented by the observability package
 * and registered on `TRACE_PROCESSOR.tracingBackend`.
 *
 * The backend receives and returns {@link TraceContextData} (W3C strings) —
 * no opaque runtime objects cross the interface boundary. The OTEL backend
 * performs `propagation.extract/inject` internally in {@link startSpan}.
 */
export interface TracingBackend {
  /**
   * Create a new span.
   *
   * The backend should:
   * 1. Extract the parent from `options.parentContext` (if present).
   * 2. Create a span as a child of that parent.
   * 3. Inject the new span's identity into the returned `spanContext`.
   */
  startSpan: (options: StartSpanOptions) => RemoteSpan;
}
