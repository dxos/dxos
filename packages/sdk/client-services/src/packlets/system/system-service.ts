//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import { type Client } from '@dxos/protocols';
import { create, EmptySchema, type Empty } from '@dxos/protocols/buf';
import {
  type GetDiagnosticsRequest,
  GetDiagnosticsRequest_KEY_OPTION,
  type GetDiagnosticsResponse,
  GetDiagnosticsResponseSchema,
  type Platform,
  PlatformSchema,
  type QueryStatusRequest,
  type QueryStatusResponse,
  QueryStatusResponseSchema,
  type SystemStatus,
  type UpdateStatusRequest,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { type MaybePromise, jsonKeyReplacer } from '@dxos/util';

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

export class SystemServiceImpl implements Client.SystemService {
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

  async getConfig(): Promise<ConfigProto> {
    const config = await this._config?.();
    // Config values from @dxos/config are compatible with buf Config schema.
    return create(ConfigSchema, {
      version: config?.values.version,
      package: config?.values.package,
      runtime: config?.values.runtime,
    });
  }

  /**
   * NOTE: Since this is serialized as a JSON object, we allow the option to serialize keys.
   */
  async getDiagnostics(request: GetDiagnosticsRequest): Promise<GetDiagnosticsResponse> {
    const diagnostics = await this._getDiagnostics();
    return create(GetDiagnosticsResponseSchema, {
      timestamp: new Date(),
      diagnostics: JSON.parse(
        JSON.stringify(
          diagnostics,
          jsonKeyReplacer({
            truncate: request.keys === GetDiagnosticsRequest_KEY_OPTION.TRUNCATE,
            humanize: request.keys === GetDiagnosticsRequest_KEY_OPTION.HUMANIZE,
          }),
        ),
      ),
    });
  }

  async getPlatform(): Promise<Platform> {
    return getPlatform();
  }

  async updateStatus({ status }: UpdateStatusRequest): Promise<Empty> {
    await this._onUpdateStatus(status);
    return create(EmptySchema);
  }

  // TODO(burdon): Standardize interval option in stream request?
  queryStatus(request: QueryStatusRequest): Stream<QueryStatusResponse> {
    const interval = request.interval ?? 3_000;
    return new Stream(({ next }) => {
      const update = () => {
        next(create(QueryStatusResponseSchema, { status: this._getCurrentStatus() }));
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

  async reset(): Promise<Empty> {
    await this._onReset();
    return create(EmptySchema);
  }
}
