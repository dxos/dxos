//
// Copyright 2023 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Metric, MetricSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { BaseCounter } from './base';

export class MapCounter extends BaseCounter {
  values = new Map<string, number>();
  units?: string;

  constructor({ units }: { units?: string } = {}) {
    super();
    this.units = units;
  }

  inc(key: string, by = 1): void {
    const prev = this.values.get(key) ?? 0;
    this.values.set(key, prev + by);
  }

  getData(): Metric {
    return create(MetricSchema, {
      name: this.name!,
      Value: {
        case: 'multiCounter',
        value: {
          records: Array.from(this.values.entries()).map(([key, value]) => ({
            key,
            value,
          })),
          units: this.units,
        },
      },
    });
  }
}
