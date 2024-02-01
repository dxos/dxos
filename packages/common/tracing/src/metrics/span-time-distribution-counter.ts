import { Metric } from '@dxos/protocols/proto/dxos/tracing';
import { BaseCounter } from './base';
import { SpanMetricsCounter } from '../api';
import { TracingSpan } from '../trace-processor';

export class SpanTimeDistributionCounter extends BaseCounter implements SpanMetricsCounter {
  private _minTime: number = Number.MAX_SAFE_INTEGER;
  private _maxTime: number = Number.MIN_SAFE_INTEGER;
  private _timeSum: number = 0;
  private _timeSumSq: number = 0;

  private _count: number = 0;
  private _errors: number = 0;

  beginSpan(span: TracingSpan): void {}

  endSpan(span: TracingSpan): void {
    const duration = span.endTs! - span.beginTs!;
    this._timeSum += duration;
    this._timeSumSq += duration ** 2;
    this._count++;
    this._minTime = Math.min(this._minTime, duration);
    this._maxTime = Math.max(this._maxTime, duration);

    if (span.error) {
      this._errors++;
    }
  }

  override getData(): Metric {
    const mean = this._timeSum / this._count;
    const stddev = Math.sqrt(this._timeSumSq / this._count - mean ** 2);

    return {
      name: this.name!,
      distribution: {
        mean,
        stddev,
        count: this._count,
        errorCount: this._errors,
        min: this._minTime,
        max: this._maxTime,
      },
    };
  }
}

/*

v = sum[(x - mean)^2] / n
v = sum[x^2 - 2*x*mean + mean^2] / n
v = sum[x^2] / n - 2*mean*mean + mean^2

*/
