//
// Copyright 2023 DXOS.org
//

import { type Metric } from '@dxos/protocols/proto/dxos/tracing';

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
    return {
      name: this.name!,
      counter: {
        value: this.value,
        units: this.units,
      },
    };
  }
}
