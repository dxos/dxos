//
// Copyright 2026 DXOS.org
//

import { type Context as OtelContext, propagation, ROOT_CONTEXT } from '@opentelemetry/api';

import { Context } from '@dxos/context';

import { TRACE_SPAN_ATTRIBUTE } from './symbols';
import { TRACE_PROCESSOR } from './trace-processor';

type TraceContext = {
  traceparent: string;
  tracestate?: string;
};

/**
 * Extract W3C trace context from a DXOS Context for injection into outgoing RPC requests.
 */
export const getTraceContext = (ctx: Context): TraceContext | undefined => {
  const spanId = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE);
  if (typeof spanId !== 'number') {
    return undefined;
  }

  const otelCtx = TRACE_PROCESSOR.remoteTracing.getSpanContext(spanId) as OtelContext | undefined;
  if (!otelCtx) {
    return undefined;
  }

  const carrier: Record<string, string> = {};
  propagation.inject(otelCtx, carrier);
  if (!carrier.traceparent) {
    return undefined;
  }

  return {
    traceparent: carrier.traceparent,
    tracestate: carrier.tracestate,
  };
};

/**
 * Create a DXOS Context from W3C trace context received from an incoming RPC request.
 * Registers the extracted OTEL context as a virtual parent span so that downstream
 * `@trace.span()` methods produce properly-parented OTEL spans.
 */
export const createContextFromTraceContext = (traceContext: TraceContext): Context => {
  const otelCtx = propagation.extract(ROOT_CONTEXT, {
    traceparent: traceContext.traceparent,
    tracestate: traceContext.tracestate ?? '',
  });

  const virtualSpanId = TRACE_PROCESSOR.remoteTracing.registerRemoteParent(otelCtx);
  return new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: virtualSpanId } });
};
