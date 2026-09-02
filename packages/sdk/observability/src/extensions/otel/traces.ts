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
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { type RemoteSpan, type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions, signalUrl } from './otel';
import * as OtelSpanSink from './OtelSpanSink';
import * as SpanFanout from './span-fanout';
import { TagInjectorSpanProcessor } from './span-processors';

export type OtelTracesOptions = OtelOptions & {
  /**
   * When set, ended spans are posted to the observability worker's `OtelSpanSink` instead of
   * being batched and exported here. Sampling, IDs, and propagation stay in this realm.
   */
  spanSink?: OtelSpanSink.Handle;
};

export class OtelTraces {
  private _tracer: Tracer;
  private readonly _tracerProvider: NodeTracerProvider;

  constructor(private readonly options: OtelTracesOptions) {
    this._tracerProvider = new NodeTracerProvider({
      resource: this.options.resource,
      spanProcessors: [
        new TagInjectorSpanProcessor(this.options.getTags),
        new SpanFanout.FanoutSpanProcessor(),
        ...(options.spanSink
          ? [new OtelSpanSink.PortSpanProcessor(options.spanSink.post)]
          : this.options.destinations.map(
              (destination) =>
                new BatchSpanProcessor(
                  new OTLPTraceExporter({
                    url: signalUrl(destination, 'traces'),
                    headers: destination.headers,
                    concurrencyLimit: 10,
                  }),
                ),
            )),
      ],
    });

    // Registers the provider, the propagator, and an async-hooks context manager. Without the
    // last, `context.active()` is always the root, so the Effect tracer's context hook is inert and
    // a log emitted inside a span cannot find it; async hooks carry it across awaits, which node
    // code does constantly and the browser's stack manager could not follow.
    this._tracerProvider.register({ propagator: new W3CTraceContextPropagator() });
    this._tracer = trace.getTracer(
      'dxos-observability',
      this.options.resource.attributes[ATTR_SERVICE_VERSION]?.toString(),
    );
  }

  /** Same surface as the browser tracer; this one exports every span, so there is nothing to promote. */
  public promote(_traceId: string): void {}

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
