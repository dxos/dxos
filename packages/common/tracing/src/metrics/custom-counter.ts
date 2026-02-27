//
// Copyright 2024 DXOS.org
//

import { create, type JsonObject } from '@dxos/protocols/buf';
import { type Metric, MetricSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { BaseCounter } from './base';

export class CustomCounter extends BaseCounter {
  constructor(private readonly _getData: () => object) {
    super();
  }

  override getData(): Metric {
    return create(MetricSchema, {
      name: this.name!,
      Value: {
        case: 'custom',
        value: {
          payload: this._getData() as JsonObject,
        },
      },
    });
  }
}
