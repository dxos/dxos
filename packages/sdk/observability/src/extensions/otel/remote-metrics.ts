//
// Copyright 2026 DXOS.org
//

import { type Attributes } from '@opentelemetry/api';

import { type CleanupFn, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { type MetricData, type MetricObserver, TRACE_PROCESSOR } from '@dxos/tracing';

import { METRIC_EXPORT_INTERVAL } from './intervals.ts';
import type * as OtelMetricsSink from './OtelMetricsSink.ts';

/** Projects tags onto OTel attributes, dropping nullish values that are not valid attribute values. */
export const metricDataToAttributes = (data?: MetricData): Attributes => {
  const tags = data?.tags;
  if (!tags) {
    return {};
  }

  return Object.entries(tags).reduce<Attributes>((attributes, [key, value]) => {
    if (value !== null && value !== undefined) {
      attributes[key] = value;
    }
    return attributes;
  }, {});
};

export class RemoteMetricsForwarder {
  readonly #post: (message: OtelMetricsSink.Init | OtelMetricsSink.Metric) => void;
  readonly #ctx = new Context();

  readonly #processor: Parameters<typeof TRACE_PROCESSOR.remoteMetrics.registerProcessor>[0] = {
    increment: (name, value, data) => this.#record('increment', name, value ?? 1, data),
    distribution: (name, value, data) => this.#record('distribution', name, value, data),
    set: () => {},
    gauge: (name, value, data) => this.#record('gauge', name, value, data),
    observe: (name, callback, data) => this.observe(name, callback, metricDataToAttributes(data), data),
  };

  constructor(post: (message: OtelMetricsSink.Init | OtelMetricsSink.Metric) => void) {
    this.#post = post;
    TRACE_PROCESSOR.remoteMetrics.registerProcessor(this.#processor);
  }

  gauge(name: string, value: number, tags?: Attributes, meta?: MetricData): void {
    this.#send('gauge', name, value, tags, meta);
  }

  increment(name: string, value?: number, tags?: Attributes, meta?: MetricData): void {
    this.#send('increment', name, value ?? 1, tags, meta);
  }

  distribution(name: string, value: number, tags?: Attributes, meta?: MetricData): void {
    this.#send('distribution', name, value, tags, meta);
  }

  observe(name: string, callback: MetricObserver, tags?: Attributes, meta?: MetricData): CleanupFn {
    const ctx = this.#ctx.derive();
    scheduleTaskInterval(
      ctx,
      async () => {
        const value = callback();
        if (value === undefined || !Number.isFinite(value)) {
          return;
        }
        this.#send('gauge', name, value, tags, meta);
      },
      METRIC_EXPORT_INTERVAL,
    );
    return () => {
      void ctx.dispose();
    };
  }

  async close(): Promise<void> {
    TRACE_PROCESSOR.remoteMetrics.unregisterProcessor(this.#processor);
    await this.#ctx.dispose();
  }

  #record(op: OtelMetricsSink.Metric['op'], name: string, value: number, data?: MetricData): void {
    this.#send(op, name, value, metricDataToAttributes(data), data);
  }

  #send(op: OtelMetricsSink.Metric['op'], name: string, value: number, tags?: Attributes, meta?: MetricData): void {
    this.#post({
      type: 'otel-metric',
      op,
      name,
      value,
      tags,
      ...(meta?.unit !== undefined || meta?.description !== undefined
        ? { meta: { unit: meta.unit, description: meta.description } }
        : {}),
    });
  }
}
