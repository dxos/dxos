//
// Copyright 2021 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { RemoteServiceConnectionTimeout } from '../../errors';
import { ClientServicesProvider, ClientServices, clientServiceBundle } from './service-definitions';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
export class ClientServicesProxy implements ClientServicesProvider {
  private readonly _client: ProtoRpcPeer<ClientServices>;

  // prettier-ignore
  constructor(
    port: RpcPort,
    private readonly _timeout = 300
  ) {
    this._client = createProtoRpcPeer({
      requested: clientServiceBundle,
      exposed: {},
      handlers: {},
      port
    });
  }

  get descriptors() {
    return clientServiceBundle;
  }

  get services() {
    return this._client.rpc;
  }

  async open() {
    await asyncTimeout(this._client.open(), this._timeout, new RemoteServiceConnectionTimeout());
  }

  async close() {
    await this._client.close();
  }
}
