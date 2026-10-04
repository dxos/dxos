//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: this is loaded by the log-writer worker, and
// hoisting it onto the root barrel would put it in the graph of everyone importing the package.

import { type Attributes } from '@opentelemetry/api';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type PushMetricExporter } from '@opentelemetry/sdk-metrics';

import { OtelMetrics } from './metrics.ts';
import { type OtelDestination } from './otel.ts';

export type Init = {
  type: 'otel-metrics-init';
  destinations: OtelDestination[];
  resourceAttributes: Record<string, string>;
  tags: Record<string, string>;
};

/**
 * One instrument series aggregated on the producer side: an increment carries its sum, a gauge its
 * latest value, a distribution every recorded value.
 */
export type Metric = {
  op: 'increment' | 'distribution' | 'gauge';
  name: string;
  values: number[];
  tags?: Attributes;
  meta?: { unit?: string; description?: string };
};

/** Everything a producer recorded since its previous batch, in one message. */
export type Batch = {
  type: 'otel-metric-batch';
  metrics: Metric[];
};

export type Message = Init | Batch;

export type Options = {
  exporter?: PushMetricExporter;
};

export class Sink {
  readonly #metrics: OtelMetrics;
  #tags: Record<string, string>;

  constructor(init: Init, options: Options = {}) {
    this.#tags = { ...init.tags };
    this.#metrics = new OtelMetrics({
      destinations: init.destinations,
      resource: defaultResource().merge(resourceFromAttributes(init.resourceAttributes)),
      getTags: () => this.#tags,
      exporter: options.exporter,
      registerTraceProcessor: false,
    });
  }

  append(batch: Batch): void {
    for (const metric of batch.metrics) {
      for (const value of metric.values) {
        this.#record(metric, value);
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

  #record(metric: Metric, value: number): void {
    switch (metric.op) {
      case 'increment': {
        this.#metrics.increment(metric.name, value, metric.tags, metric.meta);
        break;
      }
      case 'distribution': {
        this.#metrics.distribution(metric.name, value, metric.tags, metric.meta);
        break;
      }
      case 'gauge': {
        this.#metrics.gauge(metric.name, value, metric.tags, metric.meta);
        break;
      }
    }
  }
}
