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

import { log } from '@dxos/log';
import { type RemoteSpan, type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';
import { TagInjectorSpanProcessor } from './span-processors';

export class OtelTraces {
  private _tracer: Tracer;
  private readonly _tracerProvider: BasicTracerProvider;

  constructor(private readonly options: OtelOptions) {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    this._tracerProvider = new BasicTracerProvider({
      resource: this.options.resource,
      spanProcessors: [
        new TagInjectorSpanProcessor(this.options.getTags),
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: this.options.endpoint + '/v1/traces',
            headers: this.options.headers,
            concurrencyLimit: 10,
          }),
        ),
      ],
    });

    trace.setGlobalTracerProvider(this._tracerProvider);
    this._tracer = trace.getTracer(
      'dxos-observability',
      this.options.resource.attributes[ATTR_SERVICE_VERSION]?.toString(),
    );
  }

  /**
   * Forcibly flush the BatchSpanProcessor. Call before process exit to avoid
   * losing queued spans (which manifests as "Missing Span" in SigNoz — their
   * already-exported children reference a parent that never made it to OTLP).
   */
  public async flush(): Promise<void> {
    await this._tracerProvider.forceFlush();
  }

  /**
   * Flush + shut down the tracer provider via `BasicTracerProvider.shutdown()`,
   * which forces a final export then terminates all span processors.
   *
   * Terminal and effectively one-shot: safe to call after `flush()`, but
   * `flush()` MUST NOT be called after `close()` — shutdown stops further
   * exporting, so subsequent `close()`/`flush()` calls resolve without
   * emitting new spans.
   */
  public async close(): Promise<void> {
    await this._tracerProvider.shutdown();
  }

  public start(): void {
    log('trace processor registered');

    const tracer = this._tracer;

    TRACE_PROCESSOR.tracingBackend = {
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
    };
  }
}
