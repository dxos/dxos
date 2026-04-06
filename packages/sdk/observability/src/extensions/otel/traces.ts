//
// Copyright 2024 DXOS.org
//

import {
  type Context,
  ROOT_CONTEXT,
  type Tracer,
  context as otelContext,
  propagation,
  trace,
} from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;

  constructor(private readonly options: OtelOptions) {
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

    TRACE_PROCESSOR.tracingBackend = {
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        const explicitParent = options.parentContext as Context | undefined;
        const parentCtx = explicitParent ?? otelContext.active();
        const span = this._tracer.startSpan(options.name, options, parentCtx);
        const spanCtx = trace.setSpan(parentCtx, span);
        return {
          end: () => span.end(),
          spanContext: spanCtx,
        };
      },
      inject: (opaqueContext) => {
        const carrier: Record<string, string> = {};
        propagation.inject(opaqueContext as Context, carrier);
        return carrier.traceparent ? { traceparent: carrier.traceparent, tracestate: carrier.tracestate } : undefined;
      },
      extract: (traceContext) =>
        propagation.extract(ROOT_CONTEXT, {
          traceparent: traceContext.traceparent,
          tracestate: traceContext.tracestate ?? '',
        }),
    };
  }
}
