//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { Status, SystemService } from '@dxos/protocols/proto/dxos/client';

import { ServiceContext } from '../services';
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

  constructor(private readonly _config: Config, private readonly _serviceContext: ServiceContext) {
    console.log({ _serviceContext });
  }

  async initSession() {
    await this._resourceManager.acquire();
  }

  async getConfig(_request: void) {
    return this._config.values;
  }

  // TODO(burdon): Connect to iframe RPC heartbeat for network status?
  async getStatus(_request: void) {
    if (!this._serviceContext.isOpen) {
      return {
        status: Status.CLOSED
      };
    }

    return {
      status: Status.OK
    };
  }

  async reconnect(_request: void) {
    await this._resourceManager.acquire();
  }

  async reset(_request: void) {
    await this._serviceContext.reset();
  }

  private async _onAcquired() {
    await this._serviceContext.open();
  }

  private async _onReleased() {
    await this._serviceContext.close();
  }
}
