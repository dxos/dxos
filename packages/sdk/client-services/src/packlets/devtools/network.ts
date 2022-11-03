//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { CommandTrace } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import {
  GetNetworkPeersRequest,
  GetNetworkPeersResponse,
  SubscribeToNetworkTopicsResponse,
  SubscribeToSignalStatusResponse,
  SubscribeToSignalTraceResponse,
  SubscribeToSwarmInfoResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

export const subscribeToNetworkStatus = ({ networkManager }: { networkManager: NetworkManager }) =>
  new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
    const update = () => {
      try {
        const status = networkManager.signal.getStatus();
        next({ servers: status });
      } catch (err: any) {
        close(err);
      }
    };

    networkManager.signal.statusChanged.on(update);
    update();
  });

export const subscribeToSignalTrace = ({ networkManager }: { networkManager: NetworkManager }) =>
  new Stream<SubscribeToSignalTraceResponse>(({ next }) => {
    next({ events: [] });
    const trace: CommandTrace[] = [];
    networkManager.signal.commandTrace.on((msg) => {
      trace.push(msg);
      next({ events: trace.map((msg) => JSON.stringify(msg)) });
    });
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
