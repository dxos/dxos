//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { TracingService as TracingServiceRpc } from '@dxos/protocols/proto/dxos/client';

import { CreateServicesOpts } from './types';

class TracingService implements TracingServiceRpc {
  private readonly _config: Config;

  constructor ({
    config
  }: CreateServicesOpts) {
    this._config = config;
  }

  setTracingOptions () {
    throw new Error('Tracing not available.');
  }

  subscribeToRpcTrace () {
    throw new Error('Tracing not available.');
  }
}

export const createTracingService = (opts: CreateServicesOpts) => new TracingService(opts);
