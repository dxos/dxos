//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';
import {
  GetNetworkPeersRequest,
  GetNetworkPeersResponse,
  SubscribeToNetworkTopicsResponse,
  SubscribeToSignalStatusResponse,
  SubscribeToSignalTraceResponse
} from '@dxos/devtools';
import { SignalApi } from '@dxos/network-manager';

const patchProtobufTimestamp = (date: number) => ({
  seconds: (date / 1000).toString()
});

export const subscribeToNetworkStatus = (hook: DevtoolsContext) => {
  return new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
    const update = () => {
      try {
        const status = hook.networkManager.signal.getStatus();
        next({
          servers: status.map(server => ({
            ...server,
            connectionStarted: patchProtobufTimestamp(server.connectionStarted),
            lastStateChange: patchProtobufTimestamp(server.lastStateChange)
          }))
        });
      } catch (err: any) {
        close(err);
      }
    };
    hook.networkManager.signal.statusChanged.on(update);
    // This is needed to alleviate a race condition where update is sent before devtools subscribes to the stream.
    setTimeout(() => update(), 30);
  });
};

export const subscribeToSignalTrace = (hook: DevtoolsContext) => {
  return new Stream<SubscribeToSignalTraceResponse>(({ next }) => {
    const trace: SignalApi.CommandTrace[] = [];
    hook.networkManager.signal.commandTrace.on(msg => {
      trace.push(msg);
      next({ events: trace.map((msg) => JSON.stringify(msg)) });
    });
  });
};

export const subscribeToNetworkTopics = (hook: DevtoolsContext) => {
  return new Stream<SubscribeToNetworkTopicsResponse>(({ next, close }) => {
    const update = () => {
      try {
        const topics = hook.networkManager.topics;
        const labeledTopics = topics.map(topic => ({
          topic: topic.asUint8Array(),
          label: hook.networkManager.getSwarm(topic)?.label ?? topic.toHex()
        }));
        next({ topics: labeledTopics });
      } catch (err: any) {
        close(err);
      }
    };
    hook.networkManager.topicsUpdated.on(update);

    // This is needed to alleviate a race condition where update is sent before devtools subscribes to the stream.
    setTimeout(() => update(), 30);
  });
};

export const getNetworkPeers = (hook: DevtoolsContext, request: GetNetworkPeersRequest): GetNetworkPeersResponse => {
  if (!request.topic) {
    throw new Error('Expected a network topic');
  }
  const map = hook.networkManager.getSwarmMap(PublicKey.from(request.topic));
  return {
    peers: map?.peers.map(peer => ({
      ...peer,
      id: peer.id.asUint8Array(),
      connections: peer.connections.map(connection => connection.asUint8Array())
    }))
  };
};
