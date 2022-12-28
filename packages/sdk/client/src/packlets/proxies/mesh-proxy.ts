//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { ClientServicesProvider } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { ChangeNetworkStatusRequest, NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

import { ResultSet } from '../..';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private _ctx?: Context;
  private readonly _networkStatusUpdated = new Event<void>();
  private _networkStatus?: NetworkStatus;

  // prettier-ignore
  constructor(
      private readonly _serviceProvider: ClientServicesProvider
  ) {}

  toJSON() {
    return {
      networkStatus: this._networkStatus
    };
  }

  open() {
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    const networkStatusStream = this._serviceProvider.services.NetworkService.subscribeNetworkStatus();
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      console.log('networkStatusStream.subscribe', networkStatus);
      this._networkStatus = networkStatus;
      this._networkStatusUpdated.emit();
    });

    this._ctx.onDispose(() => {
      networkStatusStream.close();
      this._networkStatus = undefined;
    });
  }

  async close() {
    await this._ctx?.dispose();
  }

  getNetworkStatus() {
    assert(this._networkStatus, 'NetworkStatus is not initialized.');
    return new ResultSet<NetworkStatus>(this._networkStatusUpdated, () => [this._networkStatus!]);
  }

  /**
   * Set network mode. This is method to go to offline/online mode.
   */
  async changeNetworkStatus(request: ChangeNetworkStatusRequest) {
    return this._serviceProvider.services.NetworkService.changeNetworkStatus(request);
  }
}
