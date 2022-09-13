//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { CommandTrace } from '@dxos/messaging';
import { PublicKey } from '@dxos/protocols';

import {
  GetNetworkPeersRequest,
  GetNetworkPeersResponse,
  SubscribeToNetworkTopicsResponse,
  SubscribeToSignalStatusResponse,
  SubscribeToSignalTraceResponse,
  SubscribeToSwarmInfoResponse
} from '../proto';
import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToNetworkStatus = (hook: DevtoolsServiceDependencies) => new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
  const update = () => {
    try {
      const status = hook.networkManager.signal.getStatus();
      next({ servers: status });
    } catch (err: any) {
      close(err);
    }
  };

  hook.networkManager.signal.statusChanged.on(update);
  update();
});

export const subscribeToSignalTrace = (hook: DevtoolsServiceDependencies) => new Stream<SubscribeToSignalTraceResponse>(({ next }) => {
  next({ events: [] });
  const trace: CommandTrace[] = [];
  hook.networkManager.signal.commandTrace.on(msg => {
    trace.push(msg);
    next({ events: trace.map((msg) => JSON.stringify(msg)) });
  });
});

export const subscribeToNetworkTopics = (hook: DevtoolsServiceDependencies) => new Stream<SubscribeToNetworkTopicsResponse>(({ next, close }) => {
  const update = () => {
    try {
      const topics = hook.networkManager.topics;
      const labeledTopics = topics.map(topic => ({
        topic,
        label: hook.networkManager.getSwarm(topic)?.label ?? topic.toHex()
      }));
      next({ topics: labeledTopics });
    } catch (err: any) {
      close(err);
    }
  };
  hook.networkManager.topicsUpdated.on(update);

  update();
});

export const subscribeToSwarmInfo = (hook: DevtoolsServiceDependencies) => new Stream<SubscribeToSwarmInfoResponse>(({ next }) => {
  const networkManager = hook.networkManager;
  const update = () => {
    const info = networkManager.connectionLog?.swarms;
    if (info) {
      next({ data: info });
    }
  };
  networkManager.connectionLog?.update.on(update);
  update();
});

export const getNetworkPeers = (hook: DevtoolsServiceDependencies, request: GetNetworkPeersRequest): GetNetworkPeersResponse => {
  if (!request.topic) {
    throw new Error('Expected a network topic');
  }

  const map = hook.networkManager.getSwarmMap(PublicKey.from(request.topic));
  return {
    peers: map?.peers.map(peer => ({
      ...peer,
      connections: peer.connections.map(connection => connection.asUint8Array())
    }))
  };
};
