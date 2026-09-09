//
// Copyright 2024 DXOS.org
//

import { type Tracer, context as otelContext, propagation, trace } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { AlwaysOnSampler, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { StackContextManager, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { TRACE_ALL_KEY, TRACE_PROCESSOR } from '@dxos/tracing';

import * as AiContent from './ai-content';
import { signalUrl } from './otel';
import * as OtelSpanSink from './OtelSpanSink';
import * as SpanFanout from './span-fanout';
import { TagInjectorSpanProcessor } from './span-processors';
import * as TailSampling from './tail-sampling';
import { type OtelTracesOptions, makeTracingBackend } from './traces-shared';

export type { OtelTracesOptions };

export class OtelTraces {
  private _tracer: Tracer;
  private readonly _tracerProvider: WebTracerProvider;
  readonly #samplingProcessors: TailSampling.TailSamplingSpanProcessor[];

  constructor(private readonly options: OtelTracesOptions) {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    const forceTraceAll = typeof localStorage !== 'undefined' && localStorage.getItem(TRACE_ALL_KEY) === 'true';

    this.#samplingProcessors = options.spanSink
      ? []
      : this.options.destinations.map(
          (destination) =>
            new TailSampling.TailSamplingSpanProcessor(
              new AiContent.AiContentStrippingSpanProcessor(
                new BatchSpanProcessor(
                  new OTLPTraceExporter({
                    url: signalUrl(destination, 'traces'),
                    headers: destination.headers,
                    concurrencyLimit: 10,
                  }),
                  { scheduledDelayMillis: 5_000 },
                ),
              ),
              { ratio: forceTraceAll ? 1 : undefined },
            ),
        );

    this._tracerProvider = new WebTracerProvider({
      resource: this.options.resource,
      sampler: new AlwaysOnSampler(),
      spanProcessors: [
        new TagInjectorSpanProcessor(this.options.getTags),
        new SpanFanout.FanoutSpanProcessor(),
        ...(options.spanSink ? [new OtelSpanSink.PortSpanProcessor(options.spanSink.post)] : this.#samplingProcessors),
      ],
    });

    trace.setGlobalTracerProvider(this._tracerProvider);
    // Without a context manager `context.active()` is always the root, so the Effect tracer's
    // context hook is inert and a log emitted inside a span cannot find it.
    otelContext.setGlobalContextManager(new StackContextManager().enable());

    this._tracer = trace.getTracer(
      'dxos-observability',
      this.options.resource.attributes[ATTR_SERVICE_VERSION]?.toString(),
    );
  }

  /**
   * Forcibly flush the BatchSpanProcessor. Call before process exit / page unload
   * to avoid losing queued spans (which manifests as "Missing Span" in SigNoz —
   * their already-exported children reference a parent that never made it to OTLP).
   */
  public async flush(): Promise<void> {
    await this._tracerProvider.forceFlush();
  }

  /**
   * Flush + shut down the tracer provider via `WebTracerProvider.shutdown()`,
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

  /**
   * Keeps the rest of a trace a warning or error log named. Reaches the in-thread sampler only;
   * with a worker deciding, its own log sink promotes there instead.
   */
  public promote(traceId: string): void {
    for (const processor of this.#samplingProcessors) {
      processor.promote(traceId);
    }
  }

  public start(): void {
    log('trace processor registered');

    registerInstrumentations({
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-fetch': { enabled: false, ignoreUrls: [/api\.ipdata\.co/] },
          '@opentelemetry/instrumentation-document-load': { enabled: false },
          '@opentelemetry/instrumentation-xml-http-request': { enabled: false },
          '@opentelemetry/instrumentation-user-interaction': { enabled: false },
        }),
      ],
    });

    TRACE_PROCESSOR.tracingBackend = makeTracingBackend(this._tracer);
  }
}
