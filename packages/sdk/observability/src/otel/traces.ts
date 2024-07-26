//
// Copyright 2024 DXOS.org
//

import { trace, type Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { log } from 'debug';

import { TRACE_PROCESSOR, type StartSpanOptions } from '@dxos/tracing';

import { type OtelOptions } from './otel';

export class OtelTraces {
  private _tracer: Tracer;
  constructor(private readonly options: OtelOptions) {
    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );

    const tracerProvider = new BasicTracerProvider({ resource });
    tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    tracerProvider.addSpanProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: this.options.endpoint + '/v1/traces',
          headers: {
            Authorization: this.options.authorizationHeader,
          },
          concurrencyLimit: 10, // an optional limit on pending requests
        }),
      ),
    );
    tracerProvider.register();
    this._tracer = trace.getTracer('dxos-observability', this.options.serviceVersion);
  }

  public start() {
    log('trace processor registered');
    TRACE_PROCESSOR.remoteTracing.registerProcessor({
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        return this._tracer.startSpan(options.name, options);
      },
    });
  }
}
