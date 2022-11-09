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
// TODO(burdon): Separate construction of port from availability of services.
// TODO(burdon): Create `@dxos/client-proxy` package with thin-client only dependencies (for code-splitting).
export class ClientServicesProxy implements ClientServicesProvider {
  private readonly _proxy: ProtoRpcPeer<ClientServices>;

  // prettier-ignore
  constructor(
    port: RpcPort,
    // NOTE: With lower timeout the shared worker does not have enough time to start.
    // TODO(dmaretskyi): Find better ways to detected when the worker has finished loading. It might take a while on slow connections.
    private readonly _timeout = 1000
  ) {
    this._proxy = createProtoRpcPeer({
      requested: clientServiceBundle,
      exposed: {},
      handlers: {},
      port
    });
  }

  get proxy() {
    return this._proxy;
  }

  get descriptors() {
    return clientServiceBundle;
  }

  get services() {
    return this._proxy.rpc;
  }

  async open() {
    await asyncTimeout(this._proxy.open(), this._timeout, new RemoteServiceConnectionTimeout());
  }

  async close() {
    await this._proxy.close();
  }
}
