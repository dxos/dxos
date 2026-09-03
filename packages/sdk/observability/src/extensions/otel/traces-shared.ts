//
// Copyright 2026 DXOS.org
//

import { ROOT_CONTEXT, SpanStatusCode, type Tracer, context as otelContext, propagation } from '@opentelemetry/api';

import { log } from '@dxos/log';
import { type RemoteSpan, type StartSpanOptions, type TracingBackend } from '@dxos/tracing';

import { type OtelOptions } from './otel';
import type * as OtelSpanSink from './OtelSpanSink';

export type OtelTracesOptions = OtelOptions & {
  /**
   * When set, ended spans are posted to the observability worker's `OtelSpanSink` instead of
   * being batched and exported here. Sampling, IDs, and propagation stay in this realm.
   */
  spanSink?: OtelSpanSink.Handle;
};

/**
 * The `@dxos/tracing` backend over an OTel tracer: `@trace.span` and friends become spans on
 * whichever provider the tracer belongs to. Shared by every host variant so the mapping from a
 * `StartSpanOptions.parentContext` to a W3C `traceparent` exists once.
 */
export const makeTracingBackend = (tracer: Tracer): TracingBackend => ({
  startSpan: (options: StartSpanOptions): RemoteSpan => {
    log('begin otel trace', { options });
    const parentCtx = options.parentContext
      ? propagation.extract(ROOT_CONTEXT, {
          traceparent: options.parentContext.traceparent,
          tracestate: options.parentContext.tracestate ?? '',
        })
      : otelContext.active();

    const span = tracer.startSpan(options.name, options, parentCtx);

    const sc = span.spanContext();
    const spanContext =
      sc && sc.traceId && sc.spanId
        ? {
            traceparent: `00-${sc.traceId}-${sc.spanId}-${(sc.traceFlags ?? 0).toString(16).padStart(2, '0')}`,
            tracestate: sc.traceState?.serialize(),
          }
        : undefined;

    return {
      end: (endTime?: number) => span.end(endTime),
      setError: (err: unknown) => {
        if (err instanceof Error) {
          span.recordException(err);
        }
        span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      },
      spanContext,
    };
  },
});
