//
// Copyright 2021 DXOS.org
//

import { promiseTimeout } from '@dxos/async';
import { createBundledRpcClient, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { clientServiceBundle, ClientServiceProvider, ClientServices, RemoteServiceConnectionTimeout } from '../api';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
export class ClientServiceProxy implements ClientServiceProvider {
  private readonly _client: ProtoRpcPeer<ClientServices>;

  constructor (
    port: RpcPort,
    private readonly _timeout = 300
  ) {
    this._client = createBundledRpcClient(clientServiceBundle, {
      port
    });

    this.services = this._client.rpc;
  }

  readonly services: ClientServices;

  async open (onProgressCallback?: ((progress: any) => void) | undefined) {
    await promiseTimeout(this._client.open(), this._timeout, new RemoteServiceConnectionTimeout());
  }

  async close () {
    this._client.close();
  }
}
