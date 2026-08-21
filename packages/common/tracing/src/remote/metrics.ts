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

/**
 * Reads the current value of an observed metric. Returning `undefined` skips the
 * collection cycle, so a value that is not available yet is absent rather than zero.
 */
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
   * Preferred over {@link gauge} for any "current value" metric: a pushed gauge only
   * lands in the export windows the producer happens to tick in, leaving the series
   * full of gaps, whereas an observed one is read on every window.
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

    // Observations are long-lived registrations rather than point-in-time samples, so a
    // processor attached after the SDK registered them must be given the backlog —
    // otherwise every gauge registered during startup is silently never read.
    for (const observation of this.#observations) {
      this.#attach(observation, processor);
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
    // Guard re-registration so a processor added twice does not double-report the value.
    if (cleanups.has(processor)) {
      return;
    }

    cleanups.set(processor, processor.observe(observation.name, observation.callback, observation.data));
  }
}
