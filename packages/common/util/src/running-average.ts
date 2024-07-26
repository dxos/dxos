//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { CircularBuffer } from './circular-buffer';

export type RunningAverageConfig = {
  dataPoints: number;
  /**
   * The number of digits after decimal.
   */
  precision?: number;
};

export class RunningAverage {
  private _buffer: CircularBuffer<number>;
  private _sum = 0;

  private readonly _precision: number | undefined;

  constructor(options: { dataPoints: number; precision?: number }) {
    this._buffer = new CircularBuffer(options.dataPoints);
    if (options.precision != null) {
      invariant(options.precision >= 0);
      this._precision = Math.pow(10, options.precision);
    }
  }

  public record(value: number) {
    const evicted = this._buffer.push(value);
    this._sum += value - (evicted ?? 0);
  }

  public average() {
    if (this._buffer.elementCount === 0) {
      return 0;
    }
    const avg = this._sum / this._buffer.elementCount;
    if (this._precision == null) {
      return avg;
    }
    return Math.round(avg * this._precision) / this._precision;
  }
}
