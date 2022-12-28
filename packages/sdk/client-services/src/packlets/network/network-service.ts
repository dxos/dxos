//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { NetworkManager } from '@dxos/network-manager';
import { NetworkService, NetworkStatus, ChangeNetworkStatusRequest } from '@dxos/protocols/proto/dxos/client/services';

export class NetworkServiceImpl implements NetworkService {
  constructor(private readonly networkManager: NetworkManager) {}

  subscribeNetworkStatus() {
    return new Stream<NetworkStatus>(({ next }) => {
      const unsubscribe = this.networkManager.networkModeChanged.on((mode) => next({ mode }));
      next({ mode: this.networkManager.networkMode });

      return unsubscribe;
    });
  }

  async changeNetworkStatus(request: ChangeNetworkStatusRequest) {
    await this.networkManager.setNetworkMode(request.mode);
  }
}
