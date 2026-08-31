//
// Copyright 2026 DXOS.org
//

import { type Attributes } from '@opentelemetry/api';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type PushMetricExporter } from '@opentelemetry/sdk-metrics';

import { OtelMetrics } from './metrics';

/**
 * Sent once per connection to start metric export in the worker. Carries the options the
 * producer realm resolved — the worker itself is config-free. Resource attributes are the
 * metrics resource (no `session.id` — a per-page-load attribute would mint a new time
 * series on every reload).
 */
export type OtelMetricsSinkInit = {
  type: 'otel-metrics-init';
  endpoint: string;
  headers: Record<string, string>;
  resourceAttributes: Record<string, string>;
  tags: Record<string, string>;
};

/** One instrument call forwarded from the producer realm. */
export type OtelMetricRecord = {
  type: 'otel-metric';
  op: 'increment' | 'distribution' | 'gauge';
  name: string;
  value: number;
  tags?: Attributes;
  meta?: { unit?: string; description?: string };
};

export type OtelMetricsSinkMessage = OtelMetricsSinkInit | OtelMetricRecord;

export type OtelMetricsSinkOptions = {
  /** Test seam: replaces the OTLP exporter. */
  exporter?: PushMetricExporter;
};

/**
 * Worker-side OTel metrics pipeline: hosts the `MeterProvider`, aggregation, and the
 * periodic export timer, fed by instrument calls forwarded from the producer realm. The
 * calls are posted synchronously inside the instrumented code, so a realm blocked by a long
 * synchronous task keeps landing datapoints — the export timer here keeps ticking either way.
 */
export class OtelMetricsSink {
  readonly #metrics: OtelMetrics;
  #tags: Record<string, string>;

  constructor(init: OtelMetricsSinkInit, options: OtelMetricsSinkOptions = {}) {
    this.#tags = { ...init.tags };
    this.#metrics = new OtelMetrics({
      endpoint: init.endpoint,
      headers: init.headers,
      resource: defaultResource().merge(resourceFromAttributes(init.resourceAttributes)),
      getTags: () => this.#tags,
      exporter: options.exporter,
      // This pipeline exports one producer realm's forwarded records; the worker's own
      // TRACE_PROCESSOR must not fan into every connection's pipeline.
      registerTraceProcessor: false,
    });
  }

  append(record: OtelMetricRecord): void {
    switch (record.op) {
      case 'increment': {
        this.#metrics.increment(record.name, record.value, record.tags, record.meta);
        break;
      }
      case 'distribution': {
        this.#metrics.distribution(record.name, record.value, record.tags, record.meta);
        break;
      }
      case 'gauge': {
        this.#metrics.gauge(record.name, record.value, record.tags, record.meta);
        break;
      }
    }
  }

  setTags(tags: Record<string, string>): void {
    this.#tags = { ...this.#tags, ...tags };
  }

  flush(): Promise<void> {
    return this.#metrics.flush();
  }

  close(): Promise<void> {
    return this.#metrics.close();
  }
}
