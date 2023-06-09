//
// Copyright 2023 DXOS.org
//

import { ClientServices, ClientServicesProvider } from '@dxos/client-protocol';
import { ServiceBundle } from '@dxos/rpc';

import { ClientServicesHost, ClientServicesHostParams } from './service-host';

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  private readonly _host: ClientServicesHost;

  constructor(params: ClientServicesHostParams) {
    this._host = new ClientServicesHost(params);
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return this._host.descriptors;
  }

  get services(): Partial<ClientServices> {
    return this._host.services;
  }

  get host(): ClientServicesHost {
    return this._host;
  }

  async open(): Promise<void> {
    await this._host.open();
  }

  async close(): Promise<void> {
    await this._host.close();
  }
}
