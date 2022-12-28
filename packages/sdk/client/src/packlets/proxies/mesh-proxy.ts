//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { ClientServicesProvider } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private _ctx?: Context;
  private _networkStatus?: NetworkStatus;

  // prettier-ignore
  constructor(
      private readonly _serviceProvider: ClientServicesProvider
  ) {}

  get networkStatus() {
    assert(this._networkStatus, 'NetworkStatus is not initialized.');
    return this._networkStatus;
  }

  open() {
    this._ctx = new Context({ onError: (err) => log.catch(err) });

    const networkStatusStream = this._serviceProvider.services.NetworkService.subscribeNetworkStatus();
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatus = networkStatus;
    });

    this._ctx.onDispose(() => {
      networkStatusStream.close();
      this._networkStatus = undefined;
    });
  }

  close() {
    this._ctx?.dispose();
  }
}
