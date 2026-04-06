//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';

import { TRACE_SPAN_ATTRIBUTE } from './symbols';
import { TRACE_PROCESSOR } from './trace-processor';
import { type TraceContextData } from './tracing-types';

/**
 * Codec for serializing/deserializing DXOS Context to/from W3C trace context across RPC boundaries.
 * Used directly by RpcPeer — no configuration needed.
 */
export class ContextRpcCodec {
  /**
   * Extract W3C trace context from a DXOS Context for injection into outgoing RPC requests.
   * Reads the opaque OTEL span context from the Context attribute and delegates to the
   * tracing backend registered on the TraceProcessor.
   */
  static encode(ctx: Context): TraceContextData | undefined {
    const spanContext = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
    if (spanContext == null) {
      return undefined;
    }

    return TRACE_PROCESSOR.tracingBackend?.inject?.(spanContext);
  }

  /**
   * Create a DXOS Context from W3C trace context received from an incoming RPC request.
   * The extracted opaque OTEL context goes directly on the Context attribute so that
   * downstream `@trace.span()` methods produce properly-parented spans.
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
