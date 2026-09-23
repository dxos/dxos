//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { type SignalManager, SignalManagerService, type UnsubscribeCallback } from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService } from '@dxos/network-manager';
import { toServiceError } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { type NetworkStatus, NetworkStatusSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type SwarmResponse } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import {
  type JoinRequest,
  type LeaveRequest,
  type Message,
  type QueryRequest,
} from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { NetworkService } from '@dxos/protocols/rpc';

export class NetworkServiceImpl implements NetworkService.Handlers {
  'constructor'(
    private readonly networkManager: SwarmNetworkManager,
    private readonly signalManager: SignalManager,
    private readonly edgeConnection?: EdgeConnection,
  ) {}

  ['NetworkService.queryStatus'](): EffectStream.Stream<NetworkStatus, Error> {
    return EffectEx.streamFromEmitter<NetworkStatus, Error>((emit) => {
      const ctx = Context.default();
      const update = () => {
        void emit.single(
          buf.create(NetworkStatusSchema, {
            swarm: this.networkManager.connectionState,
            connectionInfo: this.networkManager.connectionLog?.swarms ?? [],
            signaling: this.signalManager.getStatus?.().map(({ host, state }) => ({ server: host, state })),
          }),
        );
      };

      this.networkManager.connectionStateChanged.on(ctx, () => update());
      this.signalManager.statusChanged?.on(ctx, () => update());
      update();

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['NetworkService.updateConfig'](request: NetworkService.UpdateConfigRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        await this.networkManager.setConnectionState(request.swarm);
      },
      catch: toServiceError,
    });
  }

  ['NetworkService.joinSwarm'](request: JoinRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.join(Context.default(), request);
      },
      catch: toServiceError,
    });
  }

  ['NetworkService.leaveSwarm'](request: LeaveRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.leave(Context.default(), request);
      },
      catch: toServiceError,
    });
  }

  ['NetworkService.querySwarm'](request: QueryRequest): Effect.Effect<SwarmResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        return this.signalManager.query(Context.default(), request);
      },
      catch: toServiceError,
    });
  }

  ['NetworkService.subscribeSwarmState'](
    request: NetworkService.SubscribeSwarmStateRequest,
  ): EffectStream.Stream<SwarmResponse, Error> {
    return EffectEx.streamFromEmitter<SwarmResponse, Error>((emit) => {
      const ctx = Context.default();
      this.signalManager.swarmState?.on(ctx, (state) => {
        if (request.topic.toHex() === state.swarmKey) {
          void emit.single(state);
        }
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['NetworkService.sendMessage'](message: Message): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        await this.signalManager.sendMessage(Context.default(), message);
      },
      catch: toServiceError,
    });
  }

  ['NetworkService.subscribeMessages'](
    request: NetworkService.SubscribeMessagesRequest,
  ): EffectStream.Stream<Message, Error> {
    const { peer, tags = [] } = request;
    return EffectEx.streamFromEmitter<Message, Error>((emit) => {
      const ctx = Context.default();

      // The subscription encapsulates routing (DX-1125): point-to-point messages addressed to `peer`,
      // plus — when `tags` are set — swarm broadcasts whose tags intersect. The returned callback owns
      // teardown, refcounted so it releases only this stream's tag registration.
      let unsubscribe: UnsubscribeCallback | undefined;
      void this.signalManager
        .subscribeMessages({
          peer,
          tags,
          onMessage: (message) => {
            void emit.single(message);
          },
        })
        .then((unsub) => {
          if (ctx.disposed) {
            void unsub();
          } else {
            unsubscribe = unsub;
          }
        })
        .catch((err) => emit.fail(err instanceof Error ? err : new Error(String(err))));

      return Effect.promise(async () => {
        await unsubscribe?.();
        await ctx.dispose();
      });
    });
  }
}

export const NetworkServiceLayer: Layer.Layer<
  NetworkService.Tag,
  never,
  SwarmNetworkManagerService | SignalManagerService
> = Layer.effect(
  NetworkService.Tag,
  Effect.gen(function* () {
    const networkManager = yield* SwarmNetworkManagerService;
    const signalManager = yield* SignalManagerService;
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new NetworkServiceImpl(networkManager, signalManager, edgeConnection);
  }),
);
