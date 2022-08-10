//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Config, ConfigObject } from '@dxos/config';

import { ClientOptions, Client as ClientProxy, defaultConfig } from './packlets/proxy';
import { ClientServiceHost } from './packlets/services';

const log = debug('dxos:client');

export class Client extends ClientProxy {
  constructor (config: ConfigObject | Config = defaultConfig, options: ClientOptions = {}) {
    log('Creating client host.');
    config = (config instanceof Config) ? config : new Config(config);
    const serviceProvider = new ClientServiceHost(config, options.signer);
    super(config, { ...options, serviceProvider });
  }
}
