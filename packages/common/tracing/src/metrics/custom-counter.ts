//
// Copyright 2024 DXOS.org
//

import { type Metric } from '@dxos/protocols/proto/dxos/tracing';

import { BaseCounter } from './base';

export class CustomCounter extends BaseCounter {
  constructor(private readonly _getData: () => object) {
    super();
  }

  override getData(): Metric {
    return {
      name: this.name!,
      custom: {
        payload: this._getData(),
      },
    };
  }
}
