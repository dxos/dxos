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

  // TODO(burdon): Remove.
  async initSession() {
    // Ok.
  }

  async getConfig(request: void) {
    return this._config.values;
  }

  // TODO(burdon): Reset ServiceContext
  async reset(request: any) {
    todo();
  }
}
