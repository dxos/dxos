//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type EdgeConnection } from '@dxos/edge-client';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { type Client, type Empty, EmptySchema, create } from '@dxos/protocols';
import {
  type NetworkStatus,
  NetworkStatusSchema,
  type SubscribeSwarmStateRequest,
  type UpdateConfigRequest,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Peer, type SwarmResponse } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import {
  type JoinRequest,
  type LeaveRequest,
  type Message,
  type QueryRequest,
} from '@dxos/protocols/buf/dxos/edge/signal_pb';

export class NetworkServiceImpl implements Client.NetworkService {
  constructor(
    private readonly networkManager: SwarmNetworkManager,
    private readonly signalManager: SignalManager,
    private readonly edgeConnection?: EdgeConnection,
  ) {}

  queryStatus(): Stream<NetworkStatus> {
    return new Stream<NetworkStatus>(({ ctx, next }) => {
      const update = () => {
        next(
          create(NetworkStatusSchema, {
            swarm: this.networkManager.connectionState,
            connectionInfo: this.networkManager.connectionLog?.swarms as any,
            signaling: this.signalManager.getStatus?.().map(({ host, state }) => ({ server: host, state })),
          }),
        );
      };

      this.networkManager.connectionStateChanged.on(ctx, () => update());
      this.signalManager.statusChanged?.on(ctx, () => update());
      update();
    });
  }

  async updateConfig(request: UpdateConfigRequest): Promise<Empty> {
    await this.networkManager.setConnectionState(request.swarm);
    return create(EmptySchema);
  }

  async joinSwarm(request: JoinRequest): Promise<Empty> {
    await this.signalManager.join(request as any);
    return create(EmptySchema);
  }

  async leaveSwarm(request: LeaveRequest): Promise<Empty> {
    await this.signalManager.leave(request as any);
    return create(EmptySchema);
  }

  async querySwarm(request: QueryRequest): Promise<SwarmResponse> {
    return this.signalManager.query(request as any) as any;
  }

  subscribeSwarmState(request: SubscribeSwarmStateRequest): Stream<SwarmResponse> {
    return new Stream<SwarmResponse>(({ ctx, next }) => {
      this.signalManager.swarmState?.on(ctx, (state) => {
        if (request.topic?.equals(state.swarmKey)) {
          next(state as any);
        }
      });
    });
  }

  async sendMessage(message: Message): Promise<Empty> {
    await this.signalManager.sendMessage(message as any);
    return create(EmptySchema);
  }

  subscribeMessages(peer: Peer): Stream<Message> {
    return new Stream<Message>(({ ctx, next }) => {
      this.signalManager.onMessage.on(ctx, (message) => {
        if (message.recipient.peerKey === peer.peerKey) {
          next(message as any);
        }
      });
    });
  }
}
