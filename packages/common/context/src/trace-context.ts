//
// Copyright 2026 DXOS.org
//

import { Context } from './context';

/**
 * Context attribute key for trace context data.
 * Stores {@link TraceContextData} (W3C traceparent/tracestate strings).
 */
export const TRACE_SPAN_ATTRIBUTE = 'dxos.trace-span';

/**
 * W3C Trace Context wire format for propagating trace identity.
 * Stored on DXOS {@link Context} attributes and carried across RPC boundaries.
 *
 * Because these are plain strings (not live runtime objects), they remain valid
 * after the originating span ends — enabling long-lived contexts (`this._ctx`)
 * to serve as parents for later child spans without a retention cache.
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
 * Codec for propagating trace identity across RPC boundaries.
 *
 * Hardcoded in `RpcPeer` — every outgoing request calls {@link encode} to
 * extract W3C trace context from the DXOS `Context`, and every incoming
 * request calls {@link decode} to reconstruct a DXOS `Context` carrying the
 * caller's trace context.
 *
 * This works because `TRACE_SPAN_ATTRIBUTE` stores serializable
 * {@link TraceContextData} strings, not opaque runtime objects.
 */
export class ContextRpcCodec {
  /**
   * Read the W3C trace context from a DXOS `Context` for an outgoing RPC.
   *
   * @returns `TraceContextData` to attach to the wire message, or `undefined`
   *          if the context has no active trace.
   */
  static encode(ctx: Context): TraceContextData | undefined {
    const traceCtx = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
    if (traceCtx == null || typeof traceCtx?.traceparent !== 'string') {
      return undefined;
    }
    return traceCtx as TraceContextData;
  }

  /**
   * Reconstruct a DXOS `Context` from W3C trace context received in an
   * incoming RPC request.
   *
   * @returns A `Context` carrying the trace context, or `Context.default()`
   *          if the data is missing/invalid.
   */
  static decode(traceContext: TraceContextData): Context {
    if (typeof traceContext.traceparent !== 'string' || traceContext.traceparent.length === 0) {
      return Context.default();
    }
    return new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: traceContext } });
  }
}
