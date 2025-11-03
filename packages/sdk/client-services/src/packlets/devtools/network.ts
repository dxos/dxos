//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import {
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  type SignalResponse,
  type SubscribeToNetworkTopicsResponse,
  type SubscribeToSignalStatusResponse,
  type SubscribeToSwarmInfoResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToNetworkStatus = ({ signalManager }: { signalManager: SignalManager }) =>
  new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
    const update = () => {
      try {
        const status = signalManager.getStatus?.();
        next({ servers: status });
      } catch (err: any) {
        close(err);
      }
    };

    signalManager.statusChanged?.on(() => update());
    update();
  });

export const subscribeToSignal = ({ signalManager }: { signalManager: SignalManager }) =>
  new Stream<SignalResponse>(({ next }) => {
    const ctx = new Context();
    signalManager.onMessage.on(ctx, (message) => {
      next({
        message: {
          author: PublicKey.from(message.author.peerKey).asUint8Array(),
          recipient: PublicKey.from(message.recipient.peerKey).asUint8Array(),
          payload: message.payload,
        },
        receivedAt: new Date(),
      });
    });
    signalManager.swarmEvent.on(ctx, (swarmEvent) => {
      next({
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
    return () => ctx.dispose();
  });

export const subscribeToNetworkTopics = ({ networkManager }: { networkManager: SwarmNetworkManager }) =>
  new Stream<SubscribeToNetworkTopicsResponse>(({ next, close }) => {
    const update = () => {
      try {
        const topics = networkManager.topics;
        const labeledTopics = topics.map((topic) => ({
          topic,
          label: networkManager.getSwarm(topic)?.label ?? topic.toHex(),
        }));
        next({ topics: labeledTopics });
      } catch (err: any) {
        close(err);
      }
    };
    networkManager.topicsUpdated.on(update);

    update();
  });

export const subscribeToSwarmInfo = ({ networkManager }: { networkManager: SwarmNetworkManager }) =>
  new Stream<SubscribeToSwarmInfoResponse>(({ next }) => {
    const update = () => {
      const info = networkManager.connectionLog?.swarms;
      if (info) {
        next({ data: info });
      }
    };
    networkManager.connectionLog?.update.on(update);
    update();
  });

export const getNetworkPeers = (
  { networkManager }: { networkManager: SwarmNetworkManager },
  request: GetNetworkPeersRequest,
): GetNetworkPeersResponse => {
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
