//
// Copyright 2021 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import { clientServiceBundle, type ClientServices, type ClientServicesProvider } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { RemoteServiceConnectionTimeout } from '@dxos/protocols';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';
import { trace } from '@dxos/tracing';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
@trace.resource()
export class ClientServicesProxy implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private _proxy?: ProtoRpcPeer<ClientServices>;

  constructor(
    private readonly _port: RpcPort,
    // NOTE: With lower timeout the shared worker does not have enough time to start.
    // TODO(dmaretskyi): Find better ways to detected when the worker has finished loading. It might take a while on slow connections.
    private readonly _timeout = 30_000,
  ) {}

  get proxy() {
    invariant(this._proxy, 'Client services not open');
    return this._proxy;
  }

  get descriptors() {
    return clientServiceBundle;
  }

  get services() {
    invariant(this._proxy, 'Client services not open');
    return this._proxy.rpc;
  }

  async open() {
    if (this._proxy) {
      return;
    }

    this._proxy = createProtoRpcPeer({
      requested: clientServiceBundle,
      exposed: {},
      handlers: {},
      port: this._port,
      // TODO(wittjosiah): Specifying breaks the reset flows in Composer.
      // timeout: this._timeout,
    });

    await asyncTimeout(
      this._proxy.open(),
      this._timeout,
      new RemoteServiceConnectionTimeout('Failed to establish dxrpc connection', { timeout: this._timeout }),
    );
  }

  async close() {
    if (!this._proxy) {
      return;
    }

    await this._proxy.close();
    this._proxy = undefined;
  }
}
