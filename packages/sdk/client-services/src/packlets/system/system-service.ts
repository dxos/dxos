//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import { type Client, create, EmptySchema, type Empty } from '@dxos/protocols';
import {
  GetDiagnosticsRequest_KEY_OPTION,
  GetDiagnosticsResponseSchema,
  type GetDiagnosticsRequest,
  type GetDiagnosticsResponse,
  type Platform,
  PlatformSchema,
  type QueryStatusRequest,
  type QueryStatusResponse,
  QueryStatusResponseSchema,
  SystemStatus,
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
    const values = (await this._config?.())?.values ?? {};
    return create(ConfigSchema, values as any);
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
    const platform = getPlatform();
    return create(PlatformSchema, platform as any);
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
