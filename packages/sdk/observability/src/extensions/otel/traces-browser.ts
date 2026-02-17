//
// Copyright 2024 DXOS.org
//

import { type Tracer, trace } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;

  constructor(private readonly options: OtelOptions) {
    const tracerProvider = new WebTracerProvider({
      resource: this.options.resource,
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: this.options.endpoint + '/v1/traces',
            headers: this.options.headers,
            concurrencyLimit: 10, // an optional limit on pending requests
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

    registerInstrumentations({
      instrumentations: [getWebAutoInstrumentations()],
    });

    TRACE_PROCESSOR.remoteTracing.registerProcessor({
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        return this._tracer.startSpan(options.name, options);
      },
    });
  }
}
