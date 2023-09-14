//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { SignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { NetworkService, NetworkStatus, UpdateConfigRequest } from '@dxos/protocols/proto/dxos/client/services';

export class NetworkServiceImpl implements NetworkService {
  constructor(
    private readonly networkManager: NetworkManager,
    private readonly signalManager: SignalManager,
  ) {}

  queryStatus() {
    return new Stream<NetworkStatus>(({ next }) => {
      const update = () => {
        next({
          swarm: this.networkManager.connectionState,
          signaling: this.signalManager.getStatus().map(({ host, state }) => ({ server: host, state })),
        });
      };

      const unsubscribeSwarm = this.networkManager.connectionStateChanged.on(() => update());
      const unsubscribeSignal = this.signalManager.statusChanged.on(() => update());
      update();

      return () => {
        unsubscribeSwarm();
        unsubscribeSignal();
      };
    });
  }

  async updateConfig(request: UpdateConfigRequest) {
    await this.networkManager.setConnectionState(request.swarm);
  }
}
