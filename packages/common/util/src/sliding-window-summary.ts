//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { CircularBuffer } from './circular-buffer';

export type SlidingWindowSummaryConfig = {
  dataPoints: number;
  /**
   * The number of digits after decimal.
   */
  precision?: number;
};

export class SlidingWindowSummary {
  private readonly _buffer: CircularBuffer<number>;
  private _sum = 0;

  private readonly _precision: number | undefined;

  constructor(options: SlidingWindowSummaryConfig) {
    this._buffer = new CircularBuffer(options.dataPoints);
    if (options.precision != null) {
      invariant(options.precision >= 0);
      this._precision = Math.pow(10, options.precision);
    }
  }

  public record(value: number): void {
    const evicted = this._buffer.push(value);
    this._sum += value - (evicted ?? 0);
  }

  public average(): number {
    return this._buffer.elementCount === 0 ? 0 : this._withPrecision(this._sum / this._buffer.elementCount);
  }

  public computeWindowSummary() {
    const mean = this.average();
    const sortedElements = [...this._buffer].sort();
    const median = this._withPrecision(
      sortedElements.length % 2 === 0
        ? (sortedElements[sortedElements.length / 2] + sortedElements[sortedElements.length / 2 - 1]) / 2
        : sortedElements[sortedElements.length / 2],
    );
    const p90 = this._withPrecision(sortedElements[Math.round(sortedElements.length * 0.9)]);
    const variance = sortedElements.reduce((acc, v) => acc + Math.pow(v - mean, 2)) / sortedElements.length;
    const stdDev = this._withPrecision(Math.sqrt(variance));
    const histogram = sortedElements.reduce(
      (acc, v) => {
        acc[v] += 1;
        return acc;
      },
      {} as { [element: number]: number },
    );
    return { mean, median, p90, stdDev, histogram };
  }

  private _withPrecision(value: number): number {
    if (this._precision == null) {
      return value;
    }
    return Math.round(value * this._precision) / this._precision;
  }
}
