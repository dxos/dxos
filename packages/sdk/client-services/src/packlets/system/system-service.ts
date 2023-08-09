//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import {
  Metrics,
  SystemService,
  SystemStatus,
  UpdateStatusRequest,
  QueryStatusRequest,
  QueryStatusResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { MaybePromise, numericalValues, tracer } from '@dxos/util';

export type SystemServiceOptions = {
  config?: Config;
  statusUpdate: Event<void>;
  getCurrentStatus: () => SystemStatus;
  onUpdateStatus: (status: SystemStatus) => MaybePromise<void>;
  onReset: () => MaybePromise<void>;
};

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

  async updateStatus({ status }: UpdateStatusRequest) {
    await this._onUpdateStatus(status);
  }

  queryStatus({ interval = 3_000 }: QueryStatusRequest = {}): Stream<QueryStatusResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        // TODO(burdon): Process all traces.
        const consume = tracer.get('echo.pipeline.consume') ?? [];
        const values = numericalValues(consume, 'duration');

        const metrics: Metrics = {
          timestamp: new Date(),
          // TODO(burdon): NumericalValues.
          values: [
            {
              key: 'echo.pipeline.consume.count',
              intValue: values.count,
            },
            {
              key: 'echo.pipeline.consume.mean',
              floatValue: values.mean ?? 0,
            },
            {
              key: 'echo.pipeline.consume.median',
              floatValue: values.median ?? 0,
            },
            {
              key: 'echo.pipeline.consume.min',
              intValue: values.min ?? 0,
            },
            {
              key: 'echo.pipeline.consume.max',
              intValue: values.max ?? 0,
            },
            {
              key: 'echo.pipeline.consume.total',
              intValue: values.total ?? 0,
            },
          ],
        };

        next({ status: this._getCurrentStatus(), metrics });
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
