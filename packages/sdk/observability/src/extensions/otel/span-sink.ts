//
// Copyright 2026 DXOS.org
//

import {
  type Attributes,
  type Context,
  type HrTime,
  type Link,
  type SpanContext,
  type SpanKind,
  type SpanStatus,
  TraceFlags,
} from '@opentelemetry/api';
import { TraceState, hrTimeDuration } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { type Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type Span,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { type OtelDestination, signalUrl } from './otel';

/**
 * Sent once per connection to start span export in the worker. Carries the options the
 * producer realm resolved — the worker itself is config-free.
 */
export type OtelSpanSinkInit = {
  type: 'otel-traces-init';
  destinations: OtelDestination[];
  /** Plain resource attributes for the producing realm, including `session.id`. */
  resourceAttributes: Record<string, string>;
};

/** One ended, sampled span serialized for the port (structured-cloneable plain data). */
export type OtelSpanRecord = {
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

export type OtelSpanSinkMessage = OtelSpanSinkInit | OtelSpanRecord;

/** Producer-side handle posting span records to the worker (see the extension's `telemetryWorker`). */
export type SpanSinkHandle = { post: (record: OtelSpanRecord) => void };

/** Serialize an ended span into plain data the port can clone. */
export const serializeReadableSpan = (span: ReadableSpan): OtelSpanRecord => {
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

/**
 * Producer-side span processor: replaces `BatchSpanProcessor(OTLPTraceExporter)` when export
 * runs in the telemetry worker. Sampling, ID generation, and context propagation stay in
 * the realm's tracer provider; this processor posts each ended, sampled span synchronously
 * from `onEnd`, so spans ended by code inside a long synchronous task escape the realm while
 * its own timers are stalled.
 */
export class PortSpanProcessor implements SpanProcessor {
  constructor(private readonly _post: (record: OtelSpanRecord) => void) {}

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    // Mirror BatchSpanProcessor: unsampled spans are not exported.
    if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
      return;
    }
    this._post(serializeReadableSpan(span));
  }

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}

export type OtelSpanSinkOptions = {
  /** Test seam: replaces the OTLP exporter for every destination. */
  exporter?: SpanExporter;
};

/**
 * Worker-side OTel span pipeline: re-materializes forwarded span records and feeds them to a
 * `BatchSpanProcessor` + OTLP exporter running on the worker's own event loop.
 */
export class OtelSpanSink {
  readonly #resource: Resource;
  readonly #processors: BatchSpanProcessor[];

  constructor(init: OtelSpanSinkInit, options: OtelSpanSinkOptions = {}) {
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

  append(record: OtelSpanRecord): void {
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

  #materialize(record: OtelSpanRecord): ReadableSpan {
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
