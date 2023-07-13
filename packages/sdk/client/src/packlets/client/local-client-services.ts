//
// Copyright 2023 DXOS.org
//

import { ClientServices, ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { ClientServicesHost, ClientServicesHostParams } from '@dxos/client-services';
import { ServiceBundle } from '@dxos/rpc';

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  private _host?: ClientServicesHost;

  constructor(private readonly _params: ClientServicesHostParams) {}

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._host?.services ?? {};
  }

  get host(): ClientServicesHost | undefined {
    return this._host;
  }

  async open(): Promise<void> {
    const { ClientServicesHost } = await import('@dxos/client-services');
    this._host = new ClientServicesHost(this._params);
    await this._host.open();
  }

  async close(): Promise<void> {
    await this._host?.close();
  }
}
