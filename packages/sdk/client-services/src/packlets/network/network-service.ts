//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { NetworkManager } from '@dxos/network-manager';
import { NetworkService, NetworkStatus, SetNetworkOptionsRequest } from '@dxos/protocols/proto/dxos/client/services';

export class NetworkServiceImpl implements NetworkService {
  constructor(private readonly networkManager: NetworkManager) {}

  subscribeToNetworkStatus() {
    return new Stream<NetworkStatus>(({ next }) => {
      const unsubscribe = this.networkManager.connectionStateChanged.on((state) => next({ state }));
      next({ state: this.networkManager.connectionState });

      return unsubscribe;
    });
  }

  async setNetworkOptions(request: SetNetworkOptionsRequest) {
    await this.networkManager.setState(request.state);
  }
}
