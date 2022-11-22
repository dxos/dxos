//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { SystemService } from '@dxos/protocols/proto/dxos/client';

import { ServiceContext } from '../services';

/**
 * @deprecated
 */
export class SystemServiceImpl implements SystemService {
  constructor(private readonly _config: Config, private readonly _serviceContext: ServiceContext) {}

  // TODO(burdon): Remove.
  async initSession() {
    // Ok.
  }

  async getConfig(request: void) {
    return this._config.values;
  }

  async reset(request: any) {
    await this._serviceContext.reset();
  }
}
