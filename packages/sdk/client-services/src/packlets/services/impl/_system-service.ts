//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { SystemService } from '@dxos/protocols/proto/dxos/client/services';

/**
 *
 */
export class SystemServiceImpl implements SystemService {
  // prettier-ignore
  constructor(
    private readonly _config: Config
  ) {}

  async getConfig() {
    return this._config.values;
  }

  async reset() {
    todo();
  }
}
