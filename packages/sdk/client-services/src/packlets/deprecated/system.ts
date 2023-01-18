//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { Status, SystemService } from '@dxos/protocols/proto/dxos/client';

import { ClientServicesHost } from '../services';
import { VaultResourceManager } from '../vault';

/**
 * @deprecated
 */
export class SystemServiceImpl implements SystemService {
  private readonly _resourceManager: VaultResourceManager;

  constructor(private readonly _config: Config, private readonly _serviceHost: ClientServicesHost) {
    this._resourceManager = new VaultResourceManager(this._serviceHost);
  }

  async initSession() {
    await this._resourceManager.acquire();
  }

  async getConfig(_request: void) {
    return this._config.values;
  }

  // TODO(burdon): Connect to iframe RPC heartbeat for network status?
  async getStatus(_request: void) {
    if (!this._serviceHost.isOpen) {
      return {
        status: Status.CLOSED
      };
    }

    return {
      status: Status.OK
    };
  }

  async reset(_request: void) {
    await this._serviceHost.reset();
  }
}
