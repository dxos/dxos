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
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import {
  type JoinRequest,
  type LeaveRequest,
  type Message,
  type QueryRequest,
  type SubscribeMessagesRequest,
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

  ['NetworkService.subscribeMessages'](request: SubscribeMessagesRequest): EffectStream.Stream<Message, Error> {
    const { peer, tags = [] } = request;
    return EffectStream.async<Message, Error>((emit) => {
      const ctx = Context.default();
      // Register the tag subscription so the edge fans broadcasts out to this peer (DX-1125). Targeted
      // delivery needs no registration.
      if (tags.length > 0) {
        void this.signalManager.subscribeMessages(peer, tags);
      }

      // This stream crosses the client-services RPC (protobufjs codec, e.g. dedicated worker → main
      // thread). Its `Message.payload` is a `google.protobuf.Any` without `preserve_any`, and the
      // codec refuses to encode an Any lacking '@type' — stamping the opaque form
      // ('@type': 'google.protobuf.Any' + type_url/value) makes it pass through verbatim.
      const encodableAny = (payload: Message['payload']): Message['payload'] => ({
        ...payload,
        '@type': 'google.protobuf.Any',
      });

      // Point-to-point messages addressed to this peer.
      this.signalManager.onMessage.on(ctx, (message) => {
        if (message.recipient.peerKey === peer.peerKey) {
          void emit.single({ ...message, payload: encodableAny(message.payload) });
        }
      });

      // Broadcasts whose tags intersect the subscription (logical OR); surfaced as a message addressed
      // to this peer, carrying the broadcast tags.
      this.signalManager.onBroadcast?.on(ctx, (broadcast) => {
        if (tags.length > 0 && broadcast.tags.some((tag) => tags.includes(tag))) {
          void emit.single({
            author: broadcast.author,
            recipient: peer,
            payload: encodableAny(broadcast.payload),
            tags: broadcast.tags,
          });
        }
      });

      return Effect.promise(() => {
        if (tags.length > 0) {
          // Release only this stream's tags (refcounted) — a bare unsubscribe would wholesale-clear
          // every concurrent subscriber's tags on the edge (DX-1125).
          void this.signalManager.unsubscribeMessages(peer, tags);
        }
        return ctx.dispose();
      });
    });
  }
}
