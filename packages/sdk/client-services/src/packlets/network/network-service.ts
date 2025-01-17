//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import {
  type SubscribeSwarmStateRequest,
  type NetworkService,
  type NetworkStatus,
  type UpdateConfigRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Peer, type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type LeaveRequest, type JoinRequest, type Message } from '@dxos/protocols/proto/dxos/edge/signal';

export class NetworkServiceImpl implements NetworkService {
  constructor(
    private readonly networkManager: SwarmNetworkManager,
    private readonly signalManager: SignalManager,
  ) {}

  queryStatus() {
    return new Stream<NetworkStatus>(({ next }) => {
      const update = () => {
        next({
          swarm: this.networkManager.connectionState,
          connectionInfo: this.networkManager.connectionLog?.swarms,
          signaling: this.signalManager.getStatus?.().map(({ host, state }) => ({ server: host, state })),
        });
      };

      const unsubscribeSwarm = this.networkManager.connectionStateChanged.on(() => update());
      const unsubscribeSignal = this.signalManager.statusChanged?.on(() => update());
      update();

      return () => {
        unsubscribeSwarm();
        unsubscribeSignal?.();
      };
    });
  }

  async updateConfig(request: UpdateConfigRequest) {
    await this.networkManager.setConnectionState(request.swarm);
  }

  async joinSwarm(request: JoinRequest): Promise<void> {
    return this.signalManager.join(request);
  }

  async leaveSwarm(request: LeaveRequest): Promise<void> {
    return this.signalManager.leave(request);
  }

  subscribeSwarmState(request: SubscribeSwarmStateRequest): Stream<SwarmResponse> {
    return new Stream<SwarmResponse>(({ next }) => {
      const unsubscribe = this.signalManager.swarmState?.on((state) => {
        if (request.topic.equals(state.swarmKey)) {
          next(state);
        }
      });
      return unsubscribe;
    });
  }

  async sendMessage(message: Message): Promise<void> {
    return this.signalManager.sendMessage(message);
  }

  subscribeMessages(peer: Peer): Stream<Message> {
    return new Stream<Message>(({ next }) => {
      const unsubscribe = this.signalManager.onMessage.on((message) => {
        if (message.recipient.peerKey === peer.peerKey) {
          next(message);
        }
      });

      return unsubscribe;
    });
  }
}
