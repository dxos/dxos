//
// Copyright 2021 DXOS.org
//

import { promiseTimeout } from '@dxos/async';
import { OpenProgress } from '@dxos/echo-db';
import { createBundledRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { ClientServiceProvider, ClientServices, clientServiceBundle, RemoteServiceConnectionTimeout } from '../interfaces';

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
    await promiseTimeout(this._client.open(), 3000, new RemoteServiceConnectionTimeout());
  }

  async close () {
    this._client.close();
  }
}
