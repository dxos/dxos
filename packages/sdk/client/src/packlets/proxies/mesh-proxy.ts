//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { NetworkStatus, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

import { ClientServicesProvider } from '../client';
import { Observable } from '../util';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private readonly _networkStatusUpdated = new Event<NetworkStatus>();
  private readonly _networkStatus = new Observable<NetworkStatus>(
    { state: ConnectionState.OFFLINE },
    this._networkStatusUpdated
  );

  private _ctx?: Context;

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) {}

  get networkStatus() {
    return this._networkStatus;
  }

  toJSON() {
    return {
      networkStatus: this._networkStatus.get()
    };
  }

  /**
   * @internal
   */
  async _open() {
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    assert(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    const networkStatusStream = this._serviceProvider.services.NetworkService.subscribeToNetworkStatus();
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatusUpdated.emit(networkStatus);
    });

    this._ctx.onDispose(() => {
      networkStatusStream.close();
    });
  }

  /**
   * @internal
   */
  async _close() {
    await this._ctx?.dispose();
  }

  async setConnectionState(state: ConnectionState) {
    assert(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    return this._serviceProvider.services.NetworkService.setNetworkOptions({ state });
  }
}
