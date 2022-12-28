//
// Copyright 2022 DXOS.org
//

import { NetworkManager } from '@dxos/network-manager';
import { NetworkService, SetNetworkModeRequest } from '@dxos/protocols/proto/dxos/client/services';

export class NetworkServiceImpl implements NetworkService {
  constructor(private readonly networkManager: NetworkManager) {}

  async getNetworkMode() {
    return { mode: this.networkManager.networkMode };
  }

  async setNetworkMode(request: SetNetworkModeRequest) {
    await this.networkManager.setNetworkMode(request.mode);
  }
}
