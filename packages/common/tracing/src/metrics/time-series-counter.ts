//
// Copyright 2023 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Metric, MetricSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { BaseCounter } from './base';

const MAX_BUCKETS = 60;

export class TimeSeriesCounter extends BaseCounter {
  private _currentValue = 0;
  private _totalValue = 0;
  private _buckets: number[] = [];
  units?: string;

  constructor({ units }: { units?: string } = {}) {
    super();
    this.units = units;
  }

  inc(by = 1): void {
    this._currentValue += by;
    this._totalValue += by;
  }

  override _tick(time: number): void {
    this._buckets.push(this._currentValue);
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
              units: this.units,
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
