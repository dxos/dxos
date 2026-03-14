//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type EdgeConnection } from '@dxos/edge-client';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import {
  type NetworkService,
  type NetworkStatus,
  type SubscribeSwarmStateRequest,
  type UpdateConfigRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Peer, type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import {
  type JoinRequest,
  type LeaveRequest,
  type Message,
  type QueryRequest,
} from '@dxos/protocols/proto/dxos/edge/signal';

export class NetworkServiceImpl implements NetworkService {
  constructor(
    private readonly networkManager: SwarmNetworkManager,
    private readonly signalManager: SignalManager,
    private readonly edgeConnection?: EdgeConnection,
  ) {}

  queryStatus(): Stream<NetworkStatus> {
    return new Stream<NetworkStatus>(({ ctx, next }) => {
      const update = () => {
        next({
          swarm: this.networkManager.connectionState,
          connectionInfo: this.networkManager.connectionLog?.swarms,
          signaling: this.signalManager.getStatus?.().map(({ host, state }) => ({ server: host, state })),
        });
      };

      this.networkManager.connectionStateChanged.on(ctx, () => update());
      this.signalManager.statusChanged?.on(ctx, () => update());
      update();
    });
  }

  async updateConfig(request: UpdateConfigRequest): Promise<void> {
    await this.networkManager.setConnectionState(request.swarm);
  }

  async joinSwarm(request: JoinRequest): Promise<void> {
    return this.signalManager.join(request);
  }

  async leaveSwarm(request: LeaveRequest): Promise<void> {
    return this.signalManager.leave(request);
  }

  async querySwarm(request: QueryRequest): Promise<SwarmResponse> {
    return this.signalManager.query(request);
  }

  subscribeSwarmState(request: SubscribeSwarmStateRequest): Stream<SwarmResponse> {
    return new Stream<SwarmResponse>(({ ctx, next }) => {
      this.signalManager.swarmState?.on(ctx, (state) => {
        if (request.topic.equals(state.swarmKey)) {
          next(state);
        }
      });
    });
  }

  async sendMessage(message: Message): Promise<void> {
    return this.signalManager.sendMessage(message);
  }

  subscribeMessages(peer: Peer): Stream<Message> {
    return new Stream<Message>(({ ctx, next }) => {
      this.signalManager.onMessage.on(ctx, (message) => {
        if (message.recipient.peerKey === peer.peerKey) {
          next(message);
        }
      });
    });
  }
}
