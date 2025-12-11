//
// Copyright 2021 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  ClientServicesProviderResource,
  clientServiceBundle,
} from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { RemoteServiceConnectionTimeout } from '@dxos/protocols';
import { type ProtoRpcPeer, type RpcPort, createProtoRpcPeer } from '@dxos/rpc';
import { trace } from '@dxos/tracing';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
@trace.resource({ annotation: ClientServicesProviderResource })
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

  async open(): Promise<void> {
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
      new RemoteServiceConnectionTimeout({
        message: 'Failed to establish dxrpc connection',
        context: { timeout: this._timeout },
      }),
    );
  }

  async close(): Promise<void> {
    if (!this._proxy) {
      return;
    }

    await this._proxy.close();
    this._proxy = undefined;
  }
}
