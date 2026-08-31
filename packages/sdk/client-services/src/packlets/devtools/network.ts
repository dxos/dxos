//
// Copyright 2020 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager, type UnsubscribeCallback } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { type SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
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
            emit.single({
              message: {
                author: PublicKey.from(message.author.peerKey).asUint8Array(),
                recipient: message.recipient
                  ? PublicKey.from(message.recipient.peerKey).asUint8Array()
                  : new Uint8Array(),
                payload: message.payload,
              },
              receivedAt: new Date(),
            });
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
      emit.single({
        swarmEvent: swarmEvent.peerAvailable
          ? {
              peerAvailable: {
                peer: PublicKey.from(swarmEvent.peerAvailable.peer.peerKey).asUint8Array(),
                since: swarmEvent.peerAvailable.since,
              },
            }
          : { peerLeft: { peer: PublicKey.from(swarmEvent.peerLeft!.peer.peerKey).asUint8Array() } },
        topic: swarmEvent.topic.asUint8Array(),
        receivedAt: new Date(),
      });
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
