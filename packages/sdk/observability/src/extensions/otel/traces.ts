//
// Copyright 2024 DXOS.org
//

import {
  ROOT_CONTEXT,
  SpanStatusCode,
  type Tracer,
  context as otelContext,
  propagation,
  trace,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { type TraceContextData } from '@dxos/context';
import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;

  constructor(private readonly options: OtelOptions) {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    const tracerProvider = new BasicTracerProvider({
      resource: this.options.resource,
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: this.options.endpoint + '/v1/traces',
            headers: this.options.headers,
            concurrencyLimit: 10,
          }),
        ),
      ],
    });

    trace.setGlobalTracerProvider(tracerProvider);
    this._tracer = trace.getTracer(
      'dxos-observability',
      this.options.resource.attributes[ATTR_SERVICE_VERSION]?.toString(),
    );
  }

  public start(): void {
    log('trace processor registered');

    const tracer = this._tracer;

    TRACE_PROCESSOR.tracingBackend = {
      startSpan: (options: StartSpanOptions): { end: () => void; setError?: (err: unknown) => void; spanContext?: TraceContextData } => {
        log('begin otel trace', { options });
        const parentCtx = options.parentContext
          ? propagation.extract(ROOT_CONTEXT, {
              traceparent: options.parentContext.traceparent,
              tracestate: options.parentContext.tracestate ?? '',
            })
          : otelContext.active();

        const span = tracer.startSpan(options.name, options, parentCtx);
        const spanCtx = trace.setSpan(parentCtx, span);

        const carrier: Record<string, string> = {};
        propagation.inject(spanCtx, carrier);

        return {
          end: () => span.end(),
          setError: (err: unknown) => {
            if (err instanceof Error) {
              span.recordException(err);
            }
            span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
          },
          spanContext: carrier.traceparent
            ? { traceparent: carrier.traceparent, tracestate: carrier.tracestate }
            : undefined,
        };
      },
    };
  }
}
