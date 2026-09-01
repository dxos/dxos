//
// Copyright 2026 DXOS.org
//

import { type Attributes } from '@opentelemetry/api';

import { type CleanupFn, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { type MetricData, type MetricObserver, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelMetricRecord, type OtelMetricsSinkInit } from './metrics-sink';

/**
 * Matches the sink's export interval (see `EXPORT_INTERVAL` in `metrics.ts` — not imported,
 * that module statically pulls the OTel SDK and this one must stay light). Observed gauges
 * are sampled here at the same cadence the in-process reader would have collected them.
 */
const OBSERVE_INTERVAL = 60 * 1000;

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

/**
 * Producer-side metrics forwarder: implements the `TRACE_PROCESSOR.remoteMetrics` processor
 * contract by posting each instrument call to the observability worker, where an
 * `OtelMetricsSink` hosts the real `MeterProvider` and export timer. The post happens
 * synchronously inside the instrumented code, so a realm blocked by a long synchronous task
 * keeps landing datapoints while its own timers are stalled.
 *
 * Observable gauges cannot cross a port as callbacks; `observe` samples the callback on a
 * local timer and forwards plain gauge records. A saturated event loop skips those samples —
 * the same windows the in-process reader would have missed.
 */
export class RemoteMetricsForwarder {
  readonly #post: (message: OtelMetricsSinkInit | OtelMetricRecord) => void;
  readonly #ctx = new Context();

  readonly #processor: Parameters<typeof TRACE_PROCESSOR.remoteMetrics.registerProcessor>[0] = {
    increment: (name, value, data) => this.#record('increment', name, value ?? 1, data),
    distribution: (name, value, data) => this.#record('distribution', name, value, data),
    // Not implemented, not part of the OTel spec (parity with `OtelMetrics`).
    set: () => {},
    gauge: (name, value, data) => this.#record('gauge', name, value, data),
    observe: (name, callback, data) => this.observe(name, callback, metricDataToAttributes(data), data),
  };

  constructor(post: (message: OtelMetricsSinkInit | OtelMetricRecord) => void) {
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
      OBSERVE_INTERVAL,
    );
    return () => {
      void ctx.dispose();
    };
  }

  async close(): Promise<void> {
    TRACE_PROCESSOR.remoteMetrics.unregisterProcessor(this.#processor);
    await this.#ctx.dispose();
  }

  #record(op: OtelMetricRecord['op'], name: string, value: number, data?: MetricData): void {
    this.#send(op, name, value, metricDataToAttributes(data), data);
  }

  #send(op: OtelMetricRecord['op'], name: string, value: number, tags?: Attributes, meta?: MetricData): void {
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
