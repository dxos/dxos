//
// Copyright 2020 DXOS.org
//

import { type MessageInitShape, create } from '@bufbuild/protobuf';
import { AnySchema, timestampFromDate } from '@bufbuild/protobuf/wkt';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager, type UnsubscribeCallback } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { type SignalResponse, SignalResponseSchema } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { SwarmEventSchema } from '@dxos/protocols/buf/dxos/mesh/signal_pb';
import { type DevtoolsHost } from '@dxos/protocols/rpc';

export const subscribeToNetworkStatus = ({
  signalManager,
}: {
  signalManager: SignalManager;
}): EffectStream.Stream<DevtoolsHost.SubscribeToSignalStatusResponse, Error> =>
  EffectEx.streamFromEmitter<DevtoolsHost.SubscribeToSignalStatusResponse, Error>((emit) => {
    const update = () => {
      try {
        const status = signalManager.getStatus?.();
        emit.single({ servers: status });
      } catch (err: any) {
        emit.fail(err);
      }
    };

    const unsubscribe = signalManager.statusChanged?.on(() => update());
    update();

    return Effect.sync(() => unsubscribe?.());
  });

export const subscribeToSignal = ({
  signalManager,
  networkManager,
}: {
  signalManager: SignalManager;
  networkManager: SwarmNetworkManager;
}): EffectStream.Stream<SignalResponse, Error> =>
  EffectEx.streamFromEmitter<SignalResponse, Error>((emit) => {
    const ctx = new Context();

    // Observe point-to-point messages delivered to this node's own peer. The subscription owns its
    // routing and teardown (DX-1125); with no local peer yet there is nothing to observe.
    let unsubscribe: UnsubscribeCallback | undefined;
    const peer = networkManager.getPeerInfo();
    if (peer) {
      void signalManager
        .subscribeMessages({
          peer,
          onMessage: (message) => {
            emit.single(
              create(SignalResponseSchema, {
                data: {
                  case: 'message',
                  value: {
                    author: PublicKey.from(message.author.peerKey).asUint8Array(),
                    recipient: message.recipient
                      ? PublicKey.from(message.recipient.peerKey).asUint8Array()
                      : new Uint8Array(),
                    // Messaging keeps payloads packed and dispatches on `type_url`, so this is a
                    // field map — the payload is never resolved here.
                    payload: create(AnySchema, {
                      typeUrl: message.payload.type_url,
                      value: message.payload.value,
                    }),
                  },
                },
                receivedAt: timestampFromDate(new Date()),
              }),
            );
          },
        })
        .then((unsub) => {
          if (ctx.disposed) {
            void unsub();
          } else {
            unsubscribe = unsub;
          }
        })
        .catch((err) => log.catch(err));
    }

    signalManager.swarmEvent.on(ctx, (swarmEvent) => {
      const { peerAvailable, peerLeft } = swarmEvent;
      const event: MessageInitShape<typeof SwarmEventSchema>['event'] = peerAvailable
        ? {
            case: 'peerAvailable',
            value: {
              peer: PublicKey.from(peerAvailable.peer.peerKey).asUint8Array(),
              since: peerAvailable.since && timestampFromDate(peerAvailable.since),
            },
          }
        : peerLeft
          ? { case: 'peerLeft', value: { peer: PublicKey.from(peerLeft.peer.peerKey).asUint8Array() } }
          : { case: undefined };

      emit.single(
        create(SignalResponseSchema, {
          data: { case: 'swarmEvent', value: create(SwarmEventSchema, { event }) },
          topic: swarmEvent.topic.asUint8Array(),
          receivedAt: timestampFromDate(new Date()),
        }),
      );
    });

    return Effect.promise(async () => {
      await unsubscribe?.();
      await ctx.dispose();
    });
  });

export const subscribeToNetworkTopics = ({
  networkManager,
}: {
  networkManager: SwarmNetworkManager;
}): EffectStream.Stream<DevtoolsHost.SubscribeToNetworkTopicsResponse, Error> =>
  EffectEx.streamFromEmitter<DevtoolsHost.SubscribeToNetworkTopicsResponse, Error>((emit) => {
    const update = () => {
      try {
        const topics = networkManager.topics;
        const labeledTopics = topics.map((topic) => ({
          topic,
          label: networkManager.getSwarm(topic)?.label ?? topic.toHex(),
        }));
        emit.single({ topics: labeledTopics });
      } catch (err: any) {
        emit.fail(err);
      }
    };
    const unsubscribe = networkManager.topicsUpdated.on(update);

    update();

    return Effect.sync(() => unsubscribe());
  });

export const subscribeToSwarmInfo = ({
  networkManager,
}: {
  networkManager: SwarmNetworkManager;
}): EffectStream.Stream<DevtoolsHost.SubscribeToSwarmInfoResponse, Error> =>
  EffectEx.streamFromEmitter<DevtoolsHost.SubscribeToSwarmInfoResponse, Error>((emit) => {
    const update = () => {
      const info = networkManager.connectionLog?.swarms;
      if (info) {
        emit.single({ data: info });
      }
    };
    const unsubscribe = networkManager.connectionLog?.update.on(update);
    update();

    return Effect.sync(() => unsubscribe?.());
  });

export const getNetworkPeers = (
  { networkManager }: { networkManager: SwarmNetworkManager },
  request: DevtoolsHost.GetNetworkPeersRequest,
): DevtoolsHost.GetNetworkPeersResponse => {
  if (!request.topic) {
    throw new Error('Expected a network topic');
  }

  const map = networkManager.getSwarmMap(PublicKey.from(request.topic));
  return {
    peers: map?.peers.map((peer) => ({
      ...peer,
      connections: peer.connections.map((connection) => connection.asUint8Array()),
    })),
  };
};
