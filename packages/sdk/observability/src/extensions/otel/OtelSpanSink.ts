//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: this is loaded by the log-writer worker, and
// hoisting it onto the root barrel would put it in the graph of everyone importing the package.

import {
  type Attributes,
  type Context,
  type HrTime,
  type Link,
  type SpanContext,
  type SpanKind,
  type SpanStatus,
} from '@opentelemetry/api';
import { TraceState, hrTimeDuration } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { type Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type Span as SdkSpan,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { type OtelDestination, signalUrl } from './otel';
import * as TailSampling from './tail-sampling';

export type Init = {
  type: 'otel-traces-init';
  destinations: OtelDestination[];
  resourceAttributes: Record<string, string>;
};

export type Span = {
  type: 'otel-span';
  name: string;
  kind: SpanKind;
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
  parentSpanContext?: { traceId: string; spanId: string; traceFlags: number };
  startTime: HrTime;
  endTime: HrTime;
  status: SpanStatus;
  attributes: Attributes;
  events: { name: string; time: HrTime; attributes?: Attributes; droppedAttributesCount?: number }[];
  links: { context: { traceId: string; spanId: string; traceFlags: number }; attributes?: Attributes }[];
  droppedAttributesCount: number;
  droppedEventsCount: number;
  droppedLinksCount: number;
  instrumentationScope: { name: string; version?: string };
};

export type Message = Init | Span;

export type Handle = { post: (record: Span) => void };

export const serializeReadableSpan = (span: ReadableSpan): Span => {
  const spanContext = span.spanContext();
  return {
    type: 'otel-span',
    name: span.name,
    kind: span.kind,
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
    traceState: spanContext.traceState?.serialize(),
    parentSpanContext: span.parentSpanContext
      ? {
          traceId: span.parentSpanContext.traceId,
          spanId: span.parentSpanContext.spanId,
          traceFlags: span.parentSpanContext.traceFlags,
        }
      : undefined,
    startTime: span.startTime,
    endTime: span.endTime,
    status: span.status,
    attributes: { ...span.attributes },
    events: span.events.map((event) => ({
      name: event.name,
      time: event.time,
      attributes: event.attributes ? { ...event.attributes } : undefined,
      droppedAttributesCount: event.droppedAttributesCount,
    })),
    links: span.links.map((link) => ({
      context: {
        traceId: link.context.traceId,
        spanId: link.context.spanId,
        traceFlags: link.context.traceFlags,
      },
      attributes: link.attributes ? { ...link.attributes } : undefined,
    })),
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
    instrumentationScope: {
      name: span.instrumentationScope.name,
      version: span.instrumentationScope.version,
    },
  };
};

export class PortSpanProcessor implements SpanProcessor {
  constructor(private readonly _post: (record: Span) => void) {}

  onStart(_span: SdkSpan, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    // Every recorded span is forwarded. What to keep is decided in the worker, by {@link TailSampler},
    // because the rules that matter — errored, or a model call — are only knowable once a span has
    // ended. Filtering on the SAMPLED flag here would decide the question before it can be answered.
    this._post(serializeReadableSpan(span));
  }

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}

export type Options = {
  exporter?: SpanExporter;
  /** Overrides the default tail-sampling rules; pass `{ ratio: 1 }` to export everything. */
  sampling?: TailSampling.Options;
};

export class Sink {
  readonly #resource: Resource;
  readonly #processors: BatchSpanProcessor[];
  readonly #sampler: TailSampling.TailSampler;

  constructor(init: Init, options: Options = {}) {
    this.#sampler = new TailSampling.TailSampler(options.sampling);
    this.#resource = defaultResource().merge(resourceFromAttributes(init.resourceAttributes));
    this.#processors = init.destinations.map(
      (destination) =>
        new BatchSpanProcessor(
          options.exporter ??
            new OTLPTraceExporter({
              url: signalUrl(destination, 'traces'),
              headers: destination.headers,
              concurrencyLimit: 10,
            }),
        ),
    );
  }

  append(record: Span): void {
    // Decided before materializing: a dropped span should not cost the object graph the exporter
    // would have needed.
    if (!this.#sampler.keep(record)) {
      return;
    }
    const span = this.#materialize(record);
    for (const processor of this.#processors) {
      processor.onEnd(span);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this.#processors.map((processor) => processor.forceFlush()));
  }

  async close(): Promise<void> {
    await Promise.all(this.#processors.map((processor) => processor.shutdown()));
  }

  #materialize(record: Span): ReadableSpan {
    const spanContext: SpanContext = {
      traceId: record.traceId,
      spanId: record.spanId,
      traceFlags: record.traceFlags,
      traceState: record.traceState !== undefined ? new TraceState(record.traceState) : undefined,
    };
    const links: Link[] = record.links.map((link) => ({
      context: { ...link.context },
      attributes: link.attributes,
    }));
    return {
      name: record.name,
      kind: record.kind,
      spanContext: () => spanContext,
      parentSpanContext: record.parentSpanContext ? { ...record.parentSpanContext } : undefined,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      attributes: record.attributes,
      links,
      events: record.events.map((event) => ({
        name: event.name,
        time: event.time,
        attributes: event.attributes,
        droppedAttributesCount: event.droppedAttributesCount,
      })),
      duration: hrTimeDuration(record.startTime, record.endTime),
      ended: true,
      resource: this.#resource,
      instrumentationScope: { ...record.instrumentationScope },
      droppedAttributesCount: record.droppedAttributesCount,
      droppedEventsCount: record.droppedEventsCount,
      droppedLinksCount: record.droppedLinksCount,
    };
  }
}
