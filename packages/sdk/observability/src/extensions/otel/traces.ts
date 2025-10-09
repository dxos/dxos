//
// Copyright 2024 DXOS.org
//

import { type Tracer, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { log } from 'debug';

import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;

  constructor(private readonly options: OtelOptions) {
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this.options.serviceName,
        [ATTR_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );

    const tracerProvider = new BasicTracerProvider({
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

    trace.setGlobalTracerProvider(tracerProvider);
    this._tracer = trace.getTracer('dxos-observability', this.options.serviceVersion);
  }

  public start(): void {
    log('trace processor registered');

    TRACE_PROCESSOR.remoteTracing.registerProcessor({
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        return this._tracer.startSpan(options.name, options);
      },
    });
  }
}
