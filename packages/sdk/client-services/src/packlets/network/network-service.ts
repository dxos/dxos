//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { NetworkManager } from '@dxos/network-manager';
import {
  NetworkService,
  SetNetworkModeRequest,
  GetNetworkModeResponse
} from '@dxos/protocols/proto/dxos/client/services';

export class NetworkServiceImpl implements NetworkService {
  constructor(private readonly networkManager: NetworkManager) {}

  getNetworkMode() {
    return new Stream<GetNetworkModeResponse>(({ next }) => {
      next({ mode: this.networkManager.networkMode });
      const unsubscribe = this.networkManager.networkModeChanged.on((mode) => {
        next({ mode });
      });

      return unsubscribe;
    });
  }

  async setNetworkMode(request: SetNetworkModeRequest) {
    await this.networkManager.setNetworkMode(request.mode);
  }
}
