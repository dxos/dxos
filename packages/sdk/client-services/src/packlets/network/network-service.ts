//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { type EdgeConnection } from '@dxos/edge-client';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import {
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
import { type NetworkService } from '@dxos/protocols/rpc';

export class NetworkServiceImpl implements NetworkService.Handlers {
  'constructor'(
    private readonly networkManager: SwarmNetworkManager,
    private readonly signalManager: SignalManager,
    private readonly edgeConnection?: EdgeConnection,
  ) {}

  ['NetworkService.queryStatus'](): EffectStream.Stream<NetworkStatus, Error> {
    return EffectStream.async<NetworkStatus, Error>((emit) => {
      const ctx = Context.default();
      const update = () => {
        void emit.single({
          swarm: this.networkManager.connectionState,
          connectionInfo: this.networkManager.connectionLog?.swarms,
          signaling: this.signalManager.getStatus?.().map(({ host, state }) => ({ server: host, state })),
        });
      };

      this.networkManager.connectionStateChanged.on(ctx, () => update());
      this.signalManager.statusChanged?.on(ctx, () => update());
      update();

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['NetworkService.updateConfig'](request: UpdateConfigRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.networkManager.setConnectionState(request.swarm);
      },
      catch: (error) => error as Error,
    });
  }

  ['NetworkService.joinSwarm'](request: JoinRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.join(Context.default(), request);
      },
      catch: (error) => error as Error,
    });
  }

  ['NetworkService.leaveSwarm'](request: LeaveRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.leave(Context.default(), request);
      },
      catch: (error) => error as Error,
    });
  }

  ['NetworkService.querySwarm'](request: QueryRequest): Effect.Effect<SwarmResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        return this.signalManager.query(Context.default(), request);
      },
      catch: (error) => error as Error,
    });
  }

  ['NetworkService.subscribeSwarmState'](
    request: SubscribeSwarmStateRequest,
  ): EffectStream.Stream<SwarmResponse, Error> {
    return EffectStream.async<SwarmResponse, Error>((emit) => {
      const ctx = Context.default();
      this.signalManager.swarmState?.on(ctx, (state) => {
        if (request.topic.equals(state.swarmKey)) {
          void emit.single(state);
        }
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['NetworkService.sendMessage'](message: Message): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.sendMessage(Context.default(), message);
      },
      catch: (error) => error as Error,
    });
  }

  ['NetworkService.subscribeMessages'](peer: Peer): EffectStream.Stream<Message, Error> {
    return EffectStream.async<Message, Error>((emit) => {
      const ctx = Context.default();
      this.signalManager.onMessage.on(ctx, (message) => {
        if (message.recipient.peerKey === peer.peerKey) {
          void emit.single(message);
        }
      });

      return Effect.promise(() => ctx.dispose());
    });
  }
}
