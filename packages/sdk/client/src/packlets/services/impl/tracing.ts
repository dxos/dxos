//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { TracingService as TracingServiceRpc } from '@dxos/protocols/proto/dxos/devtools';

import { CreateServicesOpts } from './types';

class TracingService implements TracingServiceRpc {
  private readonly _config: Config;

  constructor ({
    config
  }: CreateServicesOpts) {
    this._config = config;
  }

  async setTracingOptions () {
    throw new Error('Tracing not available.');
  }

  subscribeToRpcTrace (): any {
    throw new Error('Tracing not available.');
  }
}

export const createTracingService = (opts: CreateServicesOpts) => new TracingService(opts);
