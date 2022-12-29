//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { ClientServicesProvider } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { ResultSet } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { NetworkStatus, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private readonly _networkStatusUpdated = new Event<void>();

  private _ctx?: Context;
  private _networkStatus: NetworkStatus = { state: ConnectionState.OFFLINE };

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) {}

  getNetworkStatus() {
    return new ResultSet<NetworkStatus>(this._networkStatusUpdated, () => [this._networkStatus]);
  }

  toJSON() {
    return {
      networkStatus: this._networkStatus
    };
  }

  async open() {
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    const networkStatusStream = this._serviceProvider.services.NetworkService.subscribeToNetworkStatus();
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatus = networkStatus;
      this._networkStatusUpdated.emit();
    });

    this._ctx.onDispose(() => {
      networkStatusStream.close();
      this._networkStatus = { state: ConnectionState.OFFLINE };
    });
  }

  async close() {
    await this._ctx?.dispose();
  }

  async goOffline() {
    return this._serviceProvider.services.NetworkService.setNetworkOptions({ state: ConnectionState.OFFLINE });
  }

  async goOnline() {
    return this._serviceProvider.services.NetworkService.setNetworkOptions({ state: ConnectionState.ONLINE });
  }
}
