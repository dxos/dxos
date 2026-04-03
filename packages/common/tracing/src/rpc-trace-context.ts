//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';

import { type TraceContextData } from './remote/tracing';
import { TRACE_SPAN_ATTRIBUTE } from './symbols';
import { TRACE_PROCESSOR } from './trace-processor';

/**
 * Extract W3C trace context from a DXOS Context for injection into outgoing RPC requests.
 * Delegates to the pluggable backend registered via `RemoteTracing.setContextPropagation`.
 */
export const getTraceContext = (ctx: Context): TraceContextData | undefined => {
  const spanId = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
  if (typeof spanId !== 'number') {
    return undefined;
  }

  return TRACE_PROCESSOR.remoteTracing.serializeSpanContext(spanId);
};

/**
 * Create a DXOS Context from W3C trace context received from an incoming RPC request.
 * Registers the extracted context as a virtual parent span so that downstream
 * `@trace.span()` methods produce properly-parented spans.
 *
 * Empty or malformed `traceparent` is ignored: returns a default Context without
 * {@link TRACE_SPAN_ATTRIBUTE} instead of registering a virtual parent.
 */
export const createContextFromTraceContext = (traceContext: TraceContextData): Context => {
  if (typeof traceContext.traceparent !== 'string' || traceContext.traceparent.length === 0) {
    return Context.default();
  }

  const virtualSpanId = TRACE_PROCESSOR.remoteTracing.deserializeAndRegisterParent(traceContext);
  if (virtualSpanId === undefined) {
    return Context.default();
  }
  return new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: virtualSpanId } });
};
