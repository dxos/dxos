//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { Status, StatusResponse, SystemService } from '@dxos/protocols/proto/dxos/client/services';
import { MaybePromise } from '@dxos/util';

export type SystemServiceOptions = {
  config: Config;
  statusUpdate: Event<void>;
  onCreateSession: () => MaybePromise<void>;
  onStatusUpdate: () => Status;
  onReset: () => MaybePromise<void>;
};

/**
 *
 */
export class SystemServiceImpl implements SystemService {
  private readonly _config: Config;
  private readonly _statusUpdate: Event<void>;
  private readonly _onCreateSession: () => MaybePromise<void>;
  private readonly _onStatusUpdate: () => Status;
  private readonly _onReset: () => MaybePromise<void>;

  constructor({ config, statusUpdate, onCreateSession, onStatusUpdate, onReset }: SystemServiceOptions) {
    this._config = config;
    this._statusUpdate = statusUpdate;
    this._onCreateSession = onCreateSession;
    this._onStatusUpdate = onStatusUpdate;
    this._onReset = onReset;
  }

  async getConfig() {
    return this._config.values;
  }

  async createSession() {
    await this._onCreateSession();
  }

  queryStatus(): Stream<StatusResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        next({ status: this._onStatusUpdate() });
      };

      const unsubscribe = this._statusUpdate.on(() => update());
      update();
      return unsubscribe;
    });
  }

  async reset() {
    await this._onReset();
  }
}
