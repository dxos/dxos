//
// Copyright 2021 DXOS.org
//

import { OpenProgress } from '@dxos/echo-db';
import { createBundledRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { ClientServiceProvider, ClientServices, clientServiceBundle } from './interfaces';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
export class ClientServiceProxy implements ClientServiceProvider {
  private readonly _client: ProtoRpcClient<ClientServices>;

  constructor (port: RpcPort) {
    this._client = createBundledRpcClient(clientServiceBundle, {
      port
    });

    this.services = this._client.rpc;
  }

  readonly services: ClientServices;

  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    await this._client.open();
  }

  async close () {
    this._client.close();
  }

  get echo () {
    throw new Error('Service proxy does not expose ECHO directly.');
    return null as any;
  }
}
