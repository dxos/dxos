//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';

import { TRACE_SPAN_ATTRIBUTE } from './symbols';
import { TRACE_PROCESSOR } from './trace-processor';
import { type TraceContextData } from './tracing-types';

/**
 * Codec for propagating trace identity across RPC boundaries.
 *
 * Hardcoded in `RpcPeer` — every outgoing request calls {@link encode} to
 * attach W3C trace context to the proto message, and every incoming request
 * calls {@link decode} to reconstruct a DXOS `Context` with the parent span.
 *
 * The opaque span context stored on `TRACE_SPAN_ATTRIBUTE` is a live runtime
 * object (e.g., OTEL `Context`) that cannot survive protobuf serialization.
 * This codec bridges that gap by delegating to {@link TracingBackend.inject}
 * and {@link TracingBackend.extract} which convert between the runtime object
 * and W3C `traceparent`/`tracestate` strings.
 *
 * When no tracing backend is registered, both methods gracefully degrade:
 * `encode` returns `undefined` (no trace header sent) and `decode` returns
 * a default `Context` (span becomes a new root).
 */
export class ContextRpcCodec {
  /**
   * Serialize the active span from a DXOS `Context` into W3C trace context
   * for an outgoing RPC request.
   *
   * @returns `TraceContextData` to attach to the proto message, or `undefined`
   *          if the context has no active span or no backend is registered.
   */
  static encode(ctx: Context): TraceContextData | undefined {
    const spanContext = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
    if (spanContext == null) {
      return undefined;
    }

    return TRACE_PROCESSOR.tracingBackend?.inject?.(spanContext);
  }

  /**
   * Reconstruct a DXOS `Context` from W3C trace context received in an
   * incoming RPC request.
   *
   * The deserialized opaque span context is placed on `TRACE_SPAN_ATTRIBUTE`
   * so that downstream `@trace.span()` methods produce properly-parented spans.
   *
   * @returns A `Context` carrying the extracted span context, or `Context.default()`
   *          if the trace data is missing/invalid or no backend is registered.
   */
  static decode(traceContext: TraceContextData): Context {
    if (typeof traceContext.traceparent !== 'string' || traceContext.traceparent.length === 0) {
      return Context.default();
    }

    const opaqueCtx = TRACE_PROCESSOR.tracingBackend?.extract?.(traceContext);
    if (opaqueCtx == null) {
      return Context.default();
    }
    return new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: opaqueCtx } });
  }
}
