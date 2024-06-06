//
// Copyright 2021 DXOS.org
//

import { Event, MulticastObservable } from '@dxos/async';
import { type ClientServicesProvider } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace as Trace } from '@dxos/protocols';
import { type NetworkStatus, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

import { RPC_TIMEOUT } from '../common';
import { trace } from '@dxos/tracing';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private readonly _networkStatusUpdated = new Event<NetworkStatus>();
  private readonly _networkStatus = MulticastObservable.from(this._networkStatusUpdated, {
    swarm: ConnectionState.OFFLINE,
    signaling: [],
  });

  private _ctx?: Context;

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    /**
     * @internal
     */
    public _traceParent?: string,
  ) {}

  toJSON() {
    return {
      networkStatus: this._networkStatus.get(),
    };
  }

  get networkStatus() {
    return this._networkStatus;
  }

  async updateConfig(swarm: ConnectionState) {
    invariant(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    return this._serviceProvider.services.NetworkService.updateConfig({ swarm }, { timeout: RPC_TIMEOUT });
  }

  /**
   * @internal
   */
  @trace.span({ showInBrowserTimeline: true })
  async _open() {
    log.trace('dxos.sdk.mesh-proxy.open', Trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    invariant(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    const networkStatusStream = this._serviceProvider.services.NetworkService.queryStatus(undefined, {
      timeout: RPC_TIMEOUT,
    });
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatusUpdated.emit(networkStatus);
    });

    this._ctx.onDispose(() => networkStatusStream.close());
    log.trace('dxos.sdk.mesh-proxy.open', Trace.end({ id: this._instanceId }));
  }

  /**
   * @internal
   */
  async _close() {
    await this._ctx?.dispose();
  }
}
