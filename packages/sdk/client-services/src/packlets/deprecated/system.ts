//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { Status, SystemService } from '@dxos/protocols/proto/dxos/client';

import { ClientServicesHost } from '../services';
import { LocalStorageResourceManager } from '../vault';

/**
 * @deprecated
 */
export class SystemServiceImpl implements SystemService {
  private readonly _resourceManager = new LocalStorageResourceManager({
    key: '__DXOSResourceManager',
    onAcquired: this._onAcquired.bind(this),
    onReleased: this._onReleased.bind(this)
  });

  constructor(private readonly _config: Config, private readonly _serviceHost: ClientServicesHost) {}

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

  private async _onAcquired() {
    await this._serviceHost.open();
  }

  private async _onReleased() {
    await this._serviceHost.close();
  }
}
