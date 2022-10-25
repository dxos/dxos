//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { SystemService as SystemServiceRpc } from '@dxos/protocols/proto/dxos/client';

export class SystemService implements SystemServiceRpc {
  constructor(private readonly _config: Config) {}

  async getConfig(request: void) {
    return this._config.values;
  }

  async reset(request: any) {
    todo();
  }
}
