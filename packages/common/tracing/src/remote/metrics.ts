//
// Copyright 2024 DXOS.org
//

import { type CleanupFn } from '@dxos/async';

type TagType = number | string | boolean | null | undefined;

export interface MetricData {
  unit?: string;
  description?: string;
  tags?: Record<string, TagType>;
  timestamp?: number;
}

/** Reads the current value; `undefined` skips the cycle so an unavailable value is absent, not zero. */
export type MetricObserver = () => number | undefined;

interface MetricsMethods {
  /**
   * Adds a value to a counter metric
   */
  increment(name: string, value?: number, data?: MetricData): void;
  /**
   * Adds a value to a distribution metric
   */
  distribution(name: string, value: number, data?: MetricData): void;
  /**
   * Adds a value to a set metric. Value must be a string or integer.
   */
  set(name: string, value: number | string, data?: MetricData): void;
  /**
   * Adds a value to a gauge metric
   */
  gauge(name: string, value: number, data?: MetricData): void;
  /**
   * Registers a callback read once per collection cycle.
   * Preferred over {@link gauge} for any "current value" metric, since a pushed gauge only lands
   * in the export windows its producer happens to tick in.
   */
  observe(name: string, callback: MetricObserver, data?: MetricData): CleanupFn;
}

type Observation = {
  name: string;
  callback: MetricObserver;
  data?: MetricData;
};

/**
 * Allows metrics to be recorded within SDK code without requiring specific consumers.
 */
export class RemoteMetrics implements MetricsMethods {
  #processors = new Set<MetricsMethods>();
  #observations = new Set<Observation>();
  #cleanups = new Map<Observation, Map<MetricsMethods, CleanupFn>>();

  registerProcessor(processor: MetricsMethods): void {
    if (this.#processors.has(processor)) {
      return;
    }

    this.#processors.add(processor);

    // Replay the backlog, because SDK code registers observations at startup and would
    // otherwise have them silently never read by a collector configured later.
    for (const observation of this.#observations) {
      this.#attach(observation, processor);
    }
  }

  /**
   * Detaches a processor and every observation attached to it.
   * Required on collector shutdown: without it the dead processor keeps receiving samples,
   * later observations attach to its closed provider, and a re-initialized collector
   * double-reports alongside it.
   */
  unregisterProcessor(processor: MetricsMethods): void {
    if (!this.#processors.delete(processor)) {
      return;
    }

    for (const cleanups of this.#cleanups.values()) {
      const cleanup = cleanups.get(processor);
      if (cleanup) {
        cleanups.delete(processor);
        cleanup();
      }
    }
  }

  increment(name: string, value?: number, data?: MetricData): void {
    for (const processor of this.#processors) {
      processor.increment(name, value, data);
    }
  }

  distribution(name: string, value: number, data?: MetricData): void {
    for (const processor of this.#processors) {
      processor.distribution(name, value, data);
    }
  }

  set(name: string, value: number | string, data?: MetricData): void {
    for (const processor of this.#processors) {
      processor.set(name, value, data);
    }
  }

  gauge(name: string, value: number, data?: MetricData): void {
    for (const processor of this.#processors) {
      processor.gauge(name, value, data);
    }
  }

  observe(name: string, callback: MetricObserver, data?: MetricData): CleanupFn {
    const observation: Observation = { name, callback, data };
    this.#observations.add(observation);
    for (const processor of this.#processors) {
      this.#attach(observation, processor);
    }

    return () => {
      this.#observations.delete(observation);
      const cleanups = this.#cleanups.get(observation);
      this.#cleanups.delete(observation);
      for (const cleanup of cleanups?.values() ?? []) {
        cleanup();
      }
    };
  }

  #attach(observation: Observation, processor: MetricsMethods): void {
    let cleanups = this.#cleanups.get(observation);
    if (!cleanups) {
      cleanups = new Map();
      this.#cleanups.set(observation, cleanups);
    }
    // A processor added twice must not double-report.
    if (cleanups.has(processor)) {
      return;
    }

    cleanups.set(processor, processor.observe(observation.name, observation.callback, observation.data));
  }
}
