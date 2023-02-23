//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { StatusResponse, SystemService } from '@dxos/protocols/proto/dxos/client';
import { MaybePromise } from '@dxos/util';

export type SystemServiceOptions = {
  config: Config;
  onInit: () => MaybePromise<void>;
  onStatus: () => MaybePromise<StatusResponse>;
  onReset: () => MaybePromise<void>;
};

/**
 * @deprecated
 */
export class SystemServiceImpl implements SystemService {
  private readonly _config: Config;
  private readonly _onInit: () => MaybePromise<void>;
  private readonly _onStatus: () => MaybePromise<StatusResponse>;
  private readonly _onReset: () => MaybePromise<void>;

  constructor({ config, onInit, onStatus, onReset }: SystemServiceOptions) {
    this._config = config;
    this._onInit = onInit;
    this._onStatus = onStatus;
    this._onReset = onReset;
  }

  async getConfig() {
    return this._config.values;
  }

  // TODO(burdon): Connect to iframe RPC heartbeat for network status?
  async getStatus() {
    return this._onStatus();
  }

  async initSession() {
    await this._onInit();
  }

  async reset() {
    await this._onReset();
  }
}
