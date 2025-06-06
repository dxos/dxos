//
// Copyright 2023 DXOS.org
//

import { type Metric } from '@dxos/protocols/proto/dxos/tracing';

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
    return {
      name: this.name!,
      multiCounter: {
        records: Array.from(this.values.entries()).map(([key, value]) => ({
          key,
          value,
        })),
        units: this.units,
      },
    };
  }
}
