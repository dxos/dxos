//
// Copyright 2026 DXOS.org
//

import { type Context, ROOT_CONTEXT, TraceFlags, isSpanContextValid, trace } from '@opentelemetry/api';

import type { TraceContext } from '@dxos/log';

/**
 * The span active on this thread right now, or nothing. Meant for a log processor: `@dxos/log`
 * knows no tracer, so whoever serializes an entry captures this and the sink links the record to
 * its trace. Only meaningful once a context manager is registered (see `OtelTraces`).
 */
export const activeTraceContext = (): TraceContext | undefined => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext !== undefined && isSpanContextValid(spanContext)
    ? { traceId: spanContext.traceId, spanId: spanContext.spanId }
    : undefined;
};

/** A context carrying a span captured on another thread, for a log record emitted here on its behalf. */
export const contextForTrace = ({ traceId, spanId }: TraceContext): Context =>
  trace.setSpanContext(ROOT_CONTEXT, { traceId, spanId, traceFlags: TraceFlags.SAMPLED, isRemote: true });
