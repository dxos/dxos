//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import {
  SystemService,
  SystemStatus,
  UpdateStatusRequest,
  QueryStatusRequest,
  QueryStatusResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { MaybePromise } from '@dxos/util';

export type SystemServiceOptions = {
  config?: Config;
  statusUpdate: Event<void>;
  getCurrentStatus: () => SystemStatus;
  onUpdateStatus: (status: SystemStatus) => MaybePromise<void>;
  onReset: () => MaybePromise<void>;
  getDiagnostics: () => Promise<any>;
};

export class SystemServiceImpl implements SystemService {
  private readonly _config?: SystemServiceOptions['config'];
  private readonly _statusUpdate: SystemServiceOptions['statusUpdate'];
  private readonly _getCurrentStatus: SystemServiceOptions['getCurrentStatus'];
  private readonly _onUpdateStatus: SystemServiceOptions['onUpdateStatus'];
  private readonly _onReset: SystemServiceOptions['onReset'];
  private readonly _getDiagnostics: SystemServiceOptions['getDiagnostics'];

  constructor({ config, statusUpdate, onUpdateStatus, getCurrentStatus, onReset, getDiagnostics }: SystemServiceOptions) {
    this._config = config;
    this._statusUpdate = statusUpdate;
    this._getCurrentStatus = getCurrentStatus;
    this._onUpdateStatus = onUpdateStatus;
    this._onReset = onReset;
    this._getDiagnostics = getDiagnostics;
  }

  async getConfig() {
    return this._config?.values ?? {};
  }

  async updateStatus({ status }: UpdateStatusRequest) {
    await this._onUpdateStatus(status);
  }

  // TODO(burdon): Standardize interval option in stream request?
  queryStatus({ interval = 3_000 }: QueryStatusRequest = {}): Stream<QueryStatusResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        next({ status: this._getCurrentStatus() });
      };

      update();
      const unsubscribe = this._statusUpdate.on(() => update());
      const i = setInterval(update, interval);
      return () => {
        clearInterval(i);
        unsubscribe();
      };
    });
  }

  async getDiagnostics() {
    return this._getDiagnostics()
  }

  async reset() {
    await this._onReset();
  }
}
