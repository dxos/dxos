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
import { jsonKeyReplacer, MaybePromise } from '@dxos/util';

import { Diagnostics } from '../services';

export type SystemServiceOptions = {
  config?: Config;
  statusUpdate: Event<void>;
  getCurrentStatus: () => SystemStatus;
  getDiagnostics: () => Promise<Partial<Diagnostics>>;
  onUpdateStatus: (status: SystemStatus) => MaybePromise<void>;
  onReset: () => MaybePromise<void>;
};

export class SystemServiceImpl implements SystemService {
  private readonly _config?: SystemServiceOptions['config'];
  private readonly _statusUpdate: SystemServiceOptions['statusUpdate'];
  private readonly _getCurrentStatus: SystemServiceOptions['getCurrentStatus'];
  private readonly _onUpdateStatus: SystemServiceOptions['onUpdateStatus'];
  private readonly _onReset: SystemServiceOptions['onReset'];
  private readonly _getDiagnostics: SystemServiceOptions['getDiagnostics'];

  constructor({
    config,
    statusUpdate,
    getDiagnostics,
    onUpdateStatus,
    getCurrentStatus,
    onReset,
  }: SystemServiceOptions) {
    this._config = config;
    this._statusUpdate = statusUpdate;
    this._getCurrentStatus = getCurrentStatus;
    this._getDiagnostics = getDiagnostics;
    this._onUpdateStatus = onUpdateStatus;
    this._onReset = onReset;
  }

  async getConfig() {
    return this._config?.values ?? {};
  }

  /**
   * NOTE: Since this is serialized as a JSON object, we allow the option to serialize keys.
   */
  async getDiagnostics() {
    const diagnostics = await this._getDiagnostics();
    return {
      timestamp: new Date(),
      diagnostics: JSON.parse(JSON.stringify(diagnostics, jsonKeyReplacer())),
    };
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

  async reset() {
    await this._onReset();
  }
}
