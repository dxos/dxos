//
// Copyright 2020 DXOS.org
//

import { Stream } from 'crx-bridge';

import { PublicKey } from '@dxos/crypto';
import { SignalApi } from '@dxos/network-manager';

import { HandlerProps } from './handler-props';

function reportError<A extends any[]> (func: (...args: A) => any): (...args: A) => void {
  return async (...args) => {
    try {
      await func(...args);
    } catch (err) {
      console.error('DXOS DevTools API error:');
      console.error(err);
    }
  };
}

async function subscribeToNetworkStatus (hook: HandlerProps['hook'], stream: Stream) {
  async function update () {
    const status = hook.networkManager.signal.getStatus();
    stream.send(status);
  }

  hook.networkManager.signal.statusChanged.on(reportError(update));
  // This is needed to alleviate a race condition where update is sent before devtools subscribes to the stream.
  setTimeout(() => update(), 30);
}

async function subscribeToNetworkTrace (hook: HandlerProps['hook'], stream: Stream) {
  const trace: SignalApi.CommandTrace[] = [];
  hook.networkManager.signal.commandTrace.on(msg => {
    reportError(() => {
      trace.push(msg);
      stream.send(trace);
    })();
  });
}

async function subscribeToNetworkTopics (hook: HandlerProps['hook'], stream: Stream) {
  async function update () {
    const topics = hook.networkManager.topics;
    const labeledTopics = topics.map(topic => ({
      topic: topic.toHex(),
      label: hook.networkManager.getSwarm(topic)?.label ?? topic.toHex()
    }));
    stream.send(labeledTopics);
  }

  hook.networkManager.topicsUpdated.on(reportError(update));
  // This is needed to alleviate a race condition where update is sent before devtools subscribes to the stream.
  setTimeout(() => update(), 30);
}

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onOpenStreamChannel('network.signal.status', (stream) => {
    reportError(subscribeToNetworkStatus)(hook, stream);
  });
  bridge.onOpenStreamChannel('network.signal.trace', (stream) => {
    reportError(subscribeToNetworkTrace)(hook, stream);
  });
  bridge.onOpenStreamChannel('network.topics', (stream) => {
    reportError(subscribeToNetworkTopics)(hook, stream);
  });
  bridge.onMessage('network.peers', ({ data }) => {
    if (!data && !data.topic) {
      throw new Error('Expected a network topic');
    }
    const map = hook.networkManager.getSwarmMap(PublicKey.from(data.topic));
    return map?.peers.map(peer => ({
      ...peer,
      // There is a problem with pushing PublicKey through the bridge.
      id: peer.id.toHex(),
      connections: peer.connections.map(connection => connection.toHex())
    }));
  });
};
