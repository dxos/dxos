//
// Copyright 2023 DXOS.org
//

import { Metric } from '@dxos/protocols/proto/dxos/tracing';

export abstract class BaseCounter {
  /**
   * @internal
   */
  _instance: any;

  name?: string;

  /**
   * @internal
   */
  _assign(instance: any, name: string) {
    this._instance = instance;
    this.name = name;
  }

  abstract getData(): Metric;

  _tick(time: number): void {}
}
