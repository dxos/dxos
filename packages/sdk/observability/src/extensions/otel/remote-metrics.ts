//
// Copyright 2026 DXOS.org
//

import { type Attributes } from '@opentelemetry/api';

import { type CleanupFn, scheduleTask, scheduleTaskInterval } from '@dxos/async';
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

/** How long recorded metrics are held before one batch is posted; well inside the export interval. */
export const METRIC_BATCH_INTERVAL = 1_000;

/** Values buffered before a batch is posted early, bounding memory when the timer is starved. */
export const METRIC_BATCH_MAX_VALUES = 10_000;

export type RemoteMetricsForwarderOptions = {
  batchInterval?: number;
  maxValues?: number;
};

/**
 * Forwards TRACE_PROCESSOR metrics to the observability worker. Hot producers record per message,
 * so records are aggregated per series and posted as one batch per interval rather than one
 * postMessage per call.
 */
export class RemoteMetricsForwarder {
  readonly #post: (message: OtelMetricsSink.Init | OtelMetricsSink.Batch) => void;
  readonly #ctx = new Context();
  readonly #batchInterval: number;
  readonly #maxValues: number;
  readonly #pending = new Map<string, OtelMetricsSink.Metric>();
  #pendingValues = 0;
  #flushScheduled = false;

  readonly #processor: Parameters<typeof TRACE_PROCESSOR.remoteMetrics.registerProcessor>[0] = {
    increment: (name, value, data) => this.#record('increment', name, value ?? 1, metricDataToAttributes(data), data),
    distribution: (name, value, data) => this.#record('distribution', name, value, metricDataToAttributes(data), data),
    set: () => {},
    gauge: (name, value, data) => this.#record('gauge', name, value, metricDataToAttributes(data), data),
    observe: (name, callback, data) => this.observe(name, callback, metricDataToAttributes(data), data),
  };

  constructor(
    post: (message: OtelMetricsSink.Init | OtelMetricsSink.Batch) => void,
    options: RemoteMetricsForwarderOptions = {},
  ) {
    this.#post = post;
    this.#batchInterval = options.batchInterval ?? METRIC_BATCH_INTERVAL;
    this.#maxValues = options.maxValues ?? METRIC_BATCH_MAX_VALUES;
    TRACE_PROCESSOR.remoteMetrics.registerProcessor(this.#processor);
  }

  gauge(name: string, value: number, tags?: Attributes, meta?: MetricData): void {
    this.#record('gauge', name, value, tags, meta);
  }

  increment(name: string, value?: number, tags?: Attributes, meta?: MetricData): void {
    this.#record('increment', name, value ?? 1, tags, meta);
  }

  distribution(name: string, value: number, tags?: Attributes, meta?: MetricData): void {
    this.#record('distribution', name, value, tags, meta);
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
        this.#record('gauge', name, value, tags, meta);
      },
      METRIC_EXPORT_INTERVAL,
    );
    return () => {
      void ctx.dispose();
    };
  }

  /**
   * Post everything recorded so far as one batch. Call before asking the worker to flush, so the
   * batch is ahead of the flush on the port.
   */
  flush(): void {
    if (this.#pending.size === 0) {
      return;
    }
    const metrics = [...this.#pending.values()];
    this.#pending.clear();
    this.#pendingValues = 0;
    this.#post({ type: 'otel-metric-batch', metrics });
  }

  async close(): Promise<void> {
    TRACE_PROCESSOR.remoteMetrics.unregisterProcessor(this.#processor);
    this.flush();
    await this.#ctx.dispose();
  }

  #record(
    op: OtelMetricsSink.Metric['op'],
    name: string,
    value: number,
    tags: Attributes | undefined,
    meta: MetricData | undefined,
  ): void {
    const key = `${op}\0${name}\0${tags === undefined ? '' : JSON.stringify(tags)}`;
    const pending = this.#pending.get(key);
    if (pending === undefined) {
      this.#pending.set(key, {
        op,
        name,
        values: [value],
        tags,
        ...(meta?.unit !== undefined || meta?.description !== undefined
          ? { meta: { unit: meta.unit, description: meta.description } }
          : {}),
      });
      this.#pendingValues++;
    } else {
      switch (op) {
        case 'increment': {
          pending.values[0] += value;
          break;
        }
        case 'gauge': {
          pending.values[0] = value;
          break;
        }
        case 'distribution': {
          pending.values.push(value);
          this.#pendingValues++;
          break;
        }
      }
    }

    if (this.#pendingValues >= this.#maxValues) {
      this.flush();
    } else {
      this.#scheduleFlush();
    }
  }

  #scheduleFlush(): void {
    if (this.#flushScheduled || this.#ctx.disposed) {
      return;
    }
    this.#flushScheduled = true;
    scheduleTask(
      this.#ctx,
      () => {
        this.#flushScheduled = false;
        this.flush();
      },
      this.#batchInterval,
    );
  }
}
