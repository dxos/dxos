//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { SystemService as SystemServiceRpc } from '@dxos/protocols/proto/dxos/client';

import { CreateServicesOpts } from '../types';

class SystemService implements SystemServiceRpc {
  private readonly _config: Config;

  constructor ({
    config
  }: CreateServicesOpts) {
    this._config = config;
  }

  async getConfig (request: void) {
    return this._config.values;
  }

  async reset (request: any) {
    todo();
  }
}

export const createSystemService = (opts: CreateServicesOpts) => new SystemService(opts);
