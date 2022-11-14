//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { SystemService } from '@dxos/protocols/proto/dxos/client';

/**
 * @deprecated
 */
export class SystemServiceImpl implements SystemService {
  constructor(private readonly _config: Config) {}

  async getConfig(request: void) {
    return this._config.values;
  }

  async reset(request: any) {
    todo();
  }
}
