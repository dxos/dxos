//
// Copyright 2024 DXOS.org
//

import {
  type Context,
  ROOT_CONTEXT,
  SpanStatusCode,
  type Tracer,
  context as otelContext,
  propagation,
  trace,
} from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  type ReadableSpan,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { type TraceContextData } from '@dxos/context';
import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

/**
 * Injects dynamic tags (e.g. userId) as attributes on every span.
 */
class TagInjectorSpanProcessor implements SpanProcessor {
  constructor(private readonly _getTags: () => Record<string, string>) {}

  onStart(span: { setAttribute: (key: string, value: string) => void }): void {
    const tags = this._getTags();
    for (const [key, value] of Object.entries(tags)) {
      span.setAttribute(key, value);
    }
  }

  onEnd(_span: ReadableSpan): void {}

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}

export class OtelTraces {
  private _tracer: Tracer;

  constructor(private readonly options: OtelOptions) {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    const forceTraceAll = typeof localStorage !== 'undefined' && localStorage.getItem('dxos.debug.traceAll') === 'true';

    const tracerProvider = new WebTracerProvider({
      resource: this.options.resource,
      sampler: new ParentBasedSampler({
        root: forceTraceAll ? new AlwaysOnSampler() : new TraceIdRatioBasedSampler(0.3),
      }),
      spanProcessors: [
        new TagInjectorSpanProcessor(this.options.getTags),
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: this.options.endpoint + '/v1/traces',
            headers: this.options.headers,
            concurrencyLimit: 10,
          }),
          { scheduledDelayMillis: 5_000 },
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
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-fetch': { enabled: false, ignoreUrls: [/api\.ipdata\.co/] },
          '@opentelemetry/instrumentation-document-load': { enabled: false },
          '@opentelemetry/instrumentation-xml-http-request': { enabled: false },
        }),
      ],
    });

    const tracer = this._tracer;

    TRACE_PROCESSOR.tracingBackend = {
      startSpan: (
        options: StartSpanOptions,
      ): { end: () => void; setError?: (err: unknown) => void; spanContext?: TraceContextData } => {
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
