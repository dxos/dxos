//
// Copyright 2023 DXOS.org
//

import { synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { ClientServicesHost, ClientServicesHostParams } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { type ServiceBundle } from '@dxos/rpc';

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  private _host?: ClientServicesHost;

  private _isOpen = false;

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

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }
    this._isOpen = true;

    const { ClientServicesHost } = await import('@dxos/client-services');
    this._host = new ClientServicesHost(this._params);
    await this._host.open(new Context());
  }

  @synchronized
  async close(): Promise<void> {
    await this._host?.close();
    this._isOpen = false;
  }
}
