//
// Copyright 2023 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Metric, MetricSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { BaseCounter } from './base';

const MAX_BUCKETS = 60;

export class TimeUsageCounter extends BaseCounter {
  private _currentValue = 0;
  private _totalValue = 0;
  private _buckets: number[] = [];

  private _lastTickTime = performance.now();

  record(time: number): void {
    this._currentValue += time;
    this._totalValue += time;
  }

  beginRecording(): { end: () => void } {
    const start = performance.now();
    return {
      end: () => {
        const end = performance.now();
        this.record(end - start);
      },
    };
  }

  override _tick(time: number): void {
    const delta = time - this._lastTickTime;
    this._lastTickTime = time;

    const percentage = (this._currentValue / delta) * 100;
    this._buckets.push(percentage);
    if (this._buckets.length > MAX_BUCKETS) {
      this._buckets.shift();
    }
    this._currentValue = 0;
  }

  override getData(): Metric {
    return create(MetricSchema, {
      name: this.name!,
      Value: {
        case: 'timeSeries',
        value: {
          tracks: [
            {
              name: this.name!,
              units: '%',
              points: this._buckets.map((value) => ({
                value,
              })),
              total: this._totalValue,
            },
          ],
        },
      },
    });
  }
}
