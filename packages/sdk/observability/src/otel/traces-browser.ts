//
// Copyright 2024 DXOS.org
//

import { type Tracer, trace } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;
  constructor(private readonly options: OtelOptions) {
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );

    const tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: this.options.endpoint + '/v1/traces',
            headers: {
              Authorization: this.options.authorizationHeader,
            },
            concurrencyLimit: 10, // an optional limit on pending requests
          }),
        ),
      ],
    });

    // TODO(nf): ContextManager? Propogator?
    trace.setGlobalTracerProvider(tracerProvider);
    this._tracer = trace.getTracer('dxos-observability', this.options.serviceVersion);
  }

  public start(): void {
    registerInstrumentations({
      instrumentations: [getWebAutoInstrumentations()],
    });
    log('trace processor registered');
    TRACE_PROCESSOR.remoteTracing.registerProcessor({
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        return this._tracer.startSpan(options.name, options);
      },
    });
  }
}
