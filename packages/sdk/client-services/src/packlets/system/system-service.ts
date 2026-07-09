//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { type Event } from '@dxos/async';
import { type Config } from '@dxos/config';
import { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';
import {
  GetDiagnosticsRequest,
  type GetDiagnosticsResponse,
  type Platform,
  type QueryStatusRequest,
  type QueryStatusResponse,
  type SystemStatus,
  type UpdateStatusRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type SystemService } from '@dxos/protocols/rpc';
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

export class SystemServiceImpl implements SystemService.Handlers {
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

  ['SystemService.getConfig'](): Effect.Effect<ConfigProto, Error> {
    return Effect.tryPromise({
      try: async () => (await this._config?.())?.values ?? {},
      catch: (error) => error as Error,
    });
  }

  /**
   * NOTE: Since this is serialized as a JSON object, we allow the option to serialize keys.
   */
  ['SystemService.getDiagnostics']({ keys }: GetDiagnosticsRequest = {}): Effect.Effect<GetDiagnosticsResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
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
      },
      catch: (error) => error as Error,
    });
  }

  ['SystemService.getPlatform'](): Effect.Effect<Platform, Error> {
    return Effect.tryPromise({
      try: async () => getPlatform(),
      catch: (error) => error as Error,
    });
  }

  ['SystemService.updateStatus']({ status }: UpdateStatusRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._onUpdateStatus(status);
      },
      catch: (error) => error as Error,
    });
  }

  // TODO(burdon): Standardize interval option in stream request?
  ['SystemService.queryStatus']({
    interval = 3_000,
  }: QueryStatusRequest = {}): EffectStream.Stream<QueryStatusResponse, Error> {
    return EffectStream.async<QueryStatusResponse, Error>((emit) => {
      const update = () => {
        void emit.single({ status: this._getCurrentStatus() });
      };

      update();
      const unsubscribe = this._statusUpdate.on(() => update());
      const i = setInterval(update, interval);
      return Effect.sync(() => {
        clearInterval(i);
        unsubscribe();
      });
    });
  }

  ['SystemService.reset'](): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this._onReset();
      },
      catch: (error) => error as Error,
    });
  }
}
