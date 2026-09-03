//
// Copyright 2024 DXOS.org
//

import { type Tracer, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import * as AiContent from './ai-content';
import { signalUrl } from './otel';
import * as OtelSpanSink from './OtelSpanSink';
import * as SpanFanout from './span-fanout';
import { TagInjectorSpanProcessor } from './span-processors';
import { type OtelTracesOptions, makeTracingBackend } from './traces-shared';

export type { OtelTracesOptions };

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
                new AiContent.AiContentStrippingSpanProcessor(
                  new BatchSpanProcessor(
                    new OTLPTraceExporter({
                      url: signalUrl(destination, 'traces'),
                      headers: destination.headers,
                      concurrencyLimit: 10,
                    }),
                  ),
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

    TRACE_PROCESSOR.tracingBackend = makeTracingBackend(this._tracer);
  }
}
