//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { type Config } from '@dxos/config';
import {
  GetDiagnosticsRequest,
  type SystemService,
  type SystemStatus,
  type UpdateStatusRequest,
  type QueryStatusRequest,
  type QueryStatusResponse,
  type Platform,
} from '@dxos/protocols/proto/dxos/client/services';
import { jsonKeyReplacer, type MaybePromise } from '@dxos/util';

import { type Diagnostics } from '../diagnostics';
import { getPlatform } from '../services/platform';

export type SystemServiceOptions = {
  config?: () => MaybePromise<Config | undefined>;
  statusUpdate: Event<void>;
  getCurrentStatus: () => SystemStatus;
  getDiagnostics: () => Promise<Partial<Diagnostics['services']>>;
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
    return (await this._config?.())?.values ?? {};
  }

  /**
   * NOTE: Since this is serialized as a JSON object, we allow the option to serialize keys.
   */
  async getDiagnostics({ keys }: GetDiagnosticsRequest = {}) {
    const diagnostics = await this._getDiagnostics();
    return {
      timestamp: new Date(),
      diagnostics: JSON.parse(
        JSON.stringify(
          diagnostics,
          jsonKeyReplacer({
            truncate: keys === GetDiagnosticsRequest.KEY_OPTION.TRUNCATE,
            humanize: keys === GetDiagnosticsRequest.KEY_OPTION.HUMANIZE,
          }),
        ),
      ),
    };
  }

  async getPlatform(): Promise<Platform> {
    return getPlatform();
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
