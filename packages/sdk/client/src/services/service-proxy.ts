//
// Copyright 2021 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';

import { Event } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  type ClientServicesRpc,
  clientServiceBundle,
  makeClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { RemoteServiceConnectionTimeout } from '@dxos/protocols';

/**
 * Implements services that are not local to the app.
 * For example, the services can be located in Wallet Extension.
 */
export class ClientServicesProxy implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private _scope?: Scope.CloseableScope;
  private _rpc?: ClientServicesRpc;
  private _services?: Partial<ClientServices>;

  constructor(
    private readonly _port: MessagePort,
    // NOTE: With lower timeout the shared worker does not have enough time to start.
    // TODO(dmaretskyi): Find better ways to detected when the worker has finished loading. It might take a while on slow connections.
    private readonly _timeout = 30_000,
  ) {}

  get descriptors() {
    return clientServiceBundle;
  }

  get rpc() {
    invariant(this._rpc, 'Client services not open');
    return this._rpc;
  }

  get services() {
    invariant(this._services, 'Client services not open');
    return this._services;
  }

  async open(): Promise<void> {
    if (this._scope) {
      return;
    }

    log('client-services-proxy: opening', { timeout: this._timeout });
    const scope = Effect.runSync(Scope.make());
    try {
      this._rpc = await EffectEx.runPromise(
        makeClientServicesRpc(this._port).pipe(
          Scope.extend(scope),
          Effect.timeoutFail({
            duration: this._timeout,
            onTimeout: () =>
              new RemoteServiceConnectionTimeout({
                message: 'Failed to establish rpc connection',
                context: { timeout: this._timeout },
              }),
          }),
        ),
      );
    } catch (err) {
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
      throw err;
    }
    this._services = makeServicesFromRpc(this._rpc, Runtime.defaultRuntime);
    this._scope = scope;
    log('client-services-proxy: opened');
  }

  async close(): Promise<void> {
    if (!this._scope) {
      return;
    }

    log('client-services-proxy: closing');
    await EffectEx.runPromise(Scope.close(this._scope, Exit.void));
    this._scope = undefined;
    this._rpc = undefined;
    this._services = undefined;
    log('client-services-proxy: closed');
  }
}
