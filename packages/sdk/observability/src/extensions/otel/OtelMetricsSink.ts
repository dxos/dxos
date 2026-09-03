//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: this is loaded by the log-writer worker, and
// hoisting it onto the root barrel would put it in the graph of everyone importing the package.

import { type Attributes } from '@opentelemetry/api';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type PushMetricExporter } from '@opentelemetry/sdk-metrics';

import { OtelMetrics } from './metrics';
import { type OtelDestination } from './otel';

export type Init = {
  type: 'otel-metrics-init';
  destinations: OtelDestination[];
  resourceAttributes: Record<string, string>;
  tags: Record<string, string>;
};

export type Metric = {
  type: 'otel-metric';
  op: 'increment' | 'distribution' | 'gauge';
  name: string;
  value: number;
  tags?: Attributes;
  meta?: { unit?: string; description?: string };
};

export type Message = Init | Metric;

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

  append(record: Metric): void {
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
