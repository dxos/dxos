//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, MulticastObservable } from '@dxos/async';
import { ClientServicesProvider } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { NetworkStatus, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
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
  /**
   * @internal
   */
  public _traceParent?: string;

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
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
    assert(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    return this._serviceProvider.services.NetworkService.updateConfig({ swarm });
  }

  /**
   * @internal
   */
  async _open() {
    log.trace('dxos.sdk.mesh-proxy.open', trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    assert(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    const networkStatusStream = this._serviceProvider.services.NetworkService.queryStatus();
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatusUpdated.emit(networkStatus);
    });

    this._ctx.onDispose(() => {
      networkStatusStream.close();
    });
    log.trace('dxos.sdk.mesh-proxy.open', trace.end({ id: this._instanceId }));
  }

  /**
   * @internal
   */
  async _close() {
    await this._ctx?.dispose();
  }
}
