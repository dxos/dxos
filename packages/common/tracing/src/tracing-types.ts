//
// Copyright 2024 DXOS.org
//

/**
 * Opaque span handle returned by {@link TracingBackend.startSpan}.
 *
 * The `spanContext` field carries backend-specific parent context data
 * (e.g., an OTEL `Context` with the active span set). It is stored on
 * the DXOS {@link Context} via the `TRACE_SPAN_ATTRIBUTE` attribute and
 * later passed back to {@link StartSpanOptions.parentContext} to establish
 * parent-child span relationships.
 *
 * The value is `unknown` because the tracing package has no OTEL dependency —
 * only the observability package knows the concrete type.
 */
export type RemoteSpan = {
  /** Signal that the span has ended. Must be called exactly once. */
  end: () => void;

  /**
   * Opaque context identifying this span in the backend.
   *
   * Stored on the DXOS `Context` attribute (`TRACE_SPAN_ATTRIBUTE`) so that
   * child `@trace.span()` methods can read it and pass it as
   * {@link StartSpanOptions.parentContext} to create properly-parented spans.
   *
   * For OTEL this is a `Context` object with the span set via `trace.setSpan()`.
   * It is a live runtime object and **cannot** be serialized — crossing an RPC
   * boundary requires {@link TracingBackend.inject} / {@link TracingBackend.extract}.
   */
  spanContext?: unknown;
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
   * Opaque parent context from a parent {@link RemoteSpan.spanContext}.
   *
   * When provided, the new span becomes a child of this parent.
   * When `undefined`, the backend may fall back to its own active context
   * (e.g., OTEL's `context.active()`), or create a root span.
   */
  parentContext?: unknown;
};

/**
 * W3C Trace Context wire format used to propagate trace identity across RPC boundaries.
 *
 * @see https://www.w3.org/TR/trace-context/
 */
export type TraceContextData = {
  /**
   * W3C `traceparent` header value.
   * Format: `{version}-{traceId}-{spanId}-{traceFlags}` (e.g., `00-abc...def-012...789-01`).
   */
  traceparent: string;
  /** Optional W3C `tracestate` header value carrying vendor-specific trace data. */
  tracestate?: string;
};

/**
 * Backend-agnostic tracing interface implemented by the observability package
 * and registered on `TRACE_PROCESSOR.tracingBackend`.
 *
 * **`startSpan`** is the only required method — simple backends like Perfetto
 * that only need span creation can omit `inject`/`extract`.
 *
 * **`inject` / `extract`** handle serialization of the opaque
 * {@link RemoteSpan.spanContext} for RPC boundaries. They exist because the
 * opaque context is a live runtime object (e.g., OTEL `Context`) that cannot
 * survive protobuf/binary wire encoding. The methods convert between the
 * runtime object and the W3C {@link TraceContextData} string representation.
 *
 * These are called by {@link ContextRpcCodec} which is hardcoded in `RpcPeer`:
 *
 * ```
 * Outgoing RPC:
 *   ctx.getAttribute(TRACE_SPAN_ATTRIBUTE)   →  inject()  →  TraceContextData on wire
 *
 * Incoming RPC:
 *   TraceContextData from wire  →  extract()  →  new Context({ TRACE_SPAN_ATTRIBUTE: opaqueCtx })
 * ```
 */
export interface TracingBackend {
  /** Create a new span. Returns a handle to end it and an opaque context for child spans. */
  startSpan: (options: StartSpanOptions) => RemoteSpan;

  /**
   * Serialize an opaque {@link RemoteSpan.spanContext} into W3C trace context
   * strings suitable for the RPC wire format.
   *
   * Returns `undefined` if the context cannot be serialized (e.g., no active trace).
   */
  inject?: (opaqueContext: unknown) => TraceContextData | undefined;

  /**
   * Deserialize W3C trace context from the wire back into an opaque span context
   * that can be stored on a DXOS {@link Context} attribute and later passed as
   * {@link StartSpanOptions.parentContext}.
   */
  extract?: (traceContext: TraceContextData) => unknown;
}
