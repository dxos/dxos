//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { NetworkManager } from '@dxos/network-manager';
import {
  GetNetworkPeersRequest,
  GetNetworkPeersResponse,
  SubscribeToNetworkTopicsResponse,
  SubscribeToSignalStatusResponse,
  SignalResponse,
  SubscribeToSwarmInfoResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToNetworkStatus = ({ networkManager }: { networkManager: NetworkManager }) =>
  new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
    const update = () => {
      try {
        const status = networkManager.signalManager.getStatus();
        next({ servers: status });
      } catch (err: any) {
        close(err);
      }
    };

    networkManager.signalManager.statusChanged.on(update);
    update();
  });

export const subscribeToSignal = ({ networkManager }: { networkManager: NetworkManager }) =>
  new Stream<SignalResponse>(({ next }) => {
    const ctx = new Context();
    networkManager.signalManager.onMessage.on(ctx, (message) => {
      console.log('subscribeToSignal', { message });
      next({
        message: {
          author: message.author.asUint8Array(),
          recipient: message.recipient.asUint8Array(),
          payload: message.payload
        }
      });
    });
    networkManager.signalManager.swarmEvent.on(ctx, (swarmEvent) => {
      console.log('subscribeToSignal', { swarmEvent });
      next({ swarmEvent });
    });
    return () => {
      return ctx.dispose();
    };
  });

export const subscribeToNetworkTopics = ({ networkManager }: { networkManager: NetworkManager }) =>
  new Stream<SubscribeToNetworkTopicsResponse>(({ next, close }) => {
    const update = () => {
      try {
        const topics = networkManager.topics;
        const labeledTopics = topics.map((topic) => ({
          topic,
          label: networkManager.getSwarm(topic)?.label ?? topic.toHex()
        }));
        next({ topics: labeledTopics });
      } catch (err: any) {
        close(err);
      }
    };
    networkManager.topicsUpdated.on(update);

    update();
  });

export const subscribeToSwarmInfo = ({ networkManager }: { networkManager: NetworkManager }) =>
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
  { networkManager }: { networkManager: NetworkManager },
  request: GetNetworkPeersRequest
): GetNetworkPeersResponse => {
  if (!request.topic) {
    throw new Error('Expected a network topic');
  }

  const map = networkManager.getSwarmMap(PublicKey.from(request.topic));
  return {
    peers: map?.peers.map((peer) => ({
      ...peer,
      connections: peer.connections.map((connection) => connection.asUint8Array())
    }))
  };
};
