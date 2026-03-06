//
// Copyright 2024 DXOS.org
//

import { type Context, type ContextManager, ROOT_CONTEXT, type Tracer, context as otelContext, propagation, trace } from '@opentelemetry/api';
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
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { type StartSpanOptions, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions } from './otel';

/**
 * Synchronous stack-based context manager.
 * Propagates parent-child span relationships for synchronous call chains.
 */
class StackContextManager implements ContextManager {
  private _stack: Context[] = [];

  active(): Context {
    return this._stack[this._stack.length - 1] ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    ctx: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    this._stack.push(ctx);
    try {
      return fn.call(thisArg!, ...args);
    } finally {
      this._stack.pop();
    }
  }

  bind<T>(ctx: Context, target: T): T {
    if (typeof target === 'function') {
      return ((...fnArgs: any[]) => this.with(ctx, target as any, undefined, ...fnArgs)) as unknown as T;
    }
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this._stack = [];
    return this;
  }
}

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
    otelContext.setGlobalContextManager(new StackContextManager().enable());
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    const forceTraceAll = typeof localStorage !== 'undefined' && localStorage.getItem('dxos.debug.traceAll') === 'true';

    const tracerProvider = new WebTracerProvider({
      resource: this.options.resource,
      ...(forceTraceAll ? { sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }) } : {}),
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
          '@opentelemetry/instrumentation-fetch': {
            ignoreUrls: [
              /localhost/,
              /127\.0\.0\.1/,
              /api\.ipdata\.co/,
              /ingest\..*\.signoz\.cloud/,
              /\.hot-update\./,
              /\/@vite\//,
              /\/node_modules\/.vite\//,
            ],
          },
          '@opentelemetry/instrumentation-document-load': { enabled: false },
          '@opentelemetry/instrumentation-xml-http-request': {
            ignoreUrls: [
              /ingest\..*\.signoz\.cloud/,
            ],
          },
        }),
      ],
    });

    TRACE_PROCESSOR.remoteTracing.registerProcessor({
      startSpan: (options: StartSpanOptions) => {
        log('begin otel trace', { options });
        const explicitParent = options.parentContext as Context | undefined;
        const parentCtx = explicitParent ?? otelContext.active();
        const span = this._tracer.startSpan(options.name, options, parentCtx);
        const spanCtx = trace.setSpan(parentCtx, span);
        return {
          end: () => span.end(),
          wrapExecution: <T>(fn: () => T): T => otelContext.with(spanCtx, fn),
          spanContext: spanCtx,
        };
      },
    });
  }
}
