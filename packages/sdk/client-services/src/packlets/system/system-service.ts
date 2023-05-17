//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import {
  SystemStatus,
  SystemStatusResponse,
  SystemService,
  UpdateSystemStatusRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { MaybePromise } from '@dxos/util';

export type SystemServiceOptions = {
  config?: Config;
  statusUpdate: Event<void>;
  getCurrentStatus: () => SystemStatus;
  onUpdateStatus: (status: SystemStatus) => MaybePromise<void>;
  onReset: () => MaybePromise<void>;
};

/**
 *
 */
export class SystemServiceImpl implements SystemService {
  private readonly _config?: SystemServiceOptions['config'];
  private readonly _statusUpdate: SystemServiceOptions['statusUpdate'];
  private readonly _getCurrentStatus: SystemServiceOptions['getCurrentStatus'];
  private readonly _onUpdateStatus: SystemServiceOptions['onUpdateStatus'];
  private readonly _onReset: SystemServiceOptions['onReset'];

  constructor({ config, statusUpdate, onUpdateStatus, getCurrentStatus, onReset }: SystemServiceOptions) {
    this._config = config;
    this._statusUpdate = statusUpdate;
    this._getCurrentStatus = getCurrentStatus;
    this._onUpdateStatus = onUpdateStatus;
    this._onReset = onReset;
  }

  async getConfig() {
    return this._config?.values ?? {};
  }

  async updateStatus({ status }: UpdateSystemStatusRequest) {
    await this._onUpdateStatus(status);
  }

  queryStatus(): Stream<SystemStatusResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        next({ status: this._getCurrentStatus() });
      };

      update();
      const unsubscribe = this._statusUpdate.on(() => update());
      const interval = setInterval(update, 3000);

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    });
  }

  async reset() {
    await this._onReset();
  }
}
