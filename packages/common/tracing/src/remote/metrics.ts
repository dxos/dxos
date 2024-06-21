//
// Copyright 2024 DXOS.org
//

type TagType = number | string | boolean | null | undefined;

export interface MetricData {
  unit?: string;
  tags?: Record<string, TagType>;
  timestamp?: number;
}

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
}

/**
 * Allows metrics to be recorded within SDK code without requiring specific consumers.
 */
export class RemoteMetrics implements MetricsMethods {
  private _metrics = new Set<MetricsMethods>();

  registerProcessor(processor: MetricsMethods) {
    this._metrics.add(processor);
  }

  increment(name: string, value?: number, data?: MetricData) {
    return Array.from(this._metrics.values()).map((processor) => processor.increment(name, value, data));
  }

  distribution(name: string, value: number, data?: MetricData) {
    return Array.from(this._metrics.values()).map((processor) => processor.distribution(name, value, data));
  }

  set(name: string, value: number | string, data?: MetricData) {
    return Array.from(this._metrics.values()).map((processor) => processor.set(name, value, data));
  }

  gauge(name: string, value: number, data?: MetricData) {
    return Array.from(this._metrics.values()).map((processor) => processor.gauge(name, value, data));
  }
}
