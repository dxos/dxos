//
// Copyright 2023 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Metric, MetricSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { BaseCounter } from './base';

export class UnaryCounter extends BaseCounter {
  value = 0;
  units?: string;

  constructor({ units }: { units?: string } = {}) {
    super();
    this.units = units;
  }

  inc(by = 1): void {
    this.value += by;
  }

  getData(): Metric {
    return create(MetricSchema, {
      name: this.name!,
      Value: {
        case: 'counter',
        value: {
          value: this.value,
          units: this.units,
        },
      },
    });
  }
}
