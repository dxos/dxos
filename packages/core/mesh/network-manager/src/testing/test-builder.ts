//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { afterTest } from '@dxos/testutils';

import { NetworkManager } from '../network-manager';
import { FullyConnectedTopology, Topology } from '../topology';
import { MemoryTransportFactory, TransportFactory } from '../transport';
import { TestProtocolPlugin, testProtocolProvider } from './test-protocol';

// Signal server will be started by the setup script.
export const TEST_SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

export type TestBuilderOptions = {
  signalUrl?: string;
};

// TODO(burdon): Builder pattern (see feed-store).
export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();

  constructor(private _options: TestBuilderOptions = {}) {}

  createSignalManager() {
    if (this._options.signalUrl) {
      return new WebsocketSignalManager([this._options.signalUrl]);
    }

    return new MemorySignalManager(this._signalContext);
  }

  createNetworkManager() {
    return new NetworkManager({
      signalManager: new MemorySignalManager(this._signalContext),
      transportFactory: MemoryTransportFactory
    });
  }
}

export interface CreatePeerOptions {
  topic: PublicKey;
  peerId: PublicKey;
  topology?: Topology;
  signalHosts?: string[];
  transportFactory: TransportFactory;
}

// TODO(burdon): Remove.
const signalContext = new MemorySignalManagerContext();

/**
 * @deprecated
 */
export const createPeer = async ({
  topic,
  peerId,
  topology = new FullyConnectedTopology(),
  signalHosts,
  transportFactory
}: CreatePeerOptions) => {
  const signalManager = signalHosts ? new WebsocketSignalManager(signalHosts!) : new MemorySignalManager(signalContext);
  await signalManager.subscribeMessages(peerId);
  const networkManager = new NetworkManager({
    signalManager,
    transportFactory
  });

  afterTest(() => networkManager.destroy());

  // TODO(burdon): Use keys everywhere.
  const plugin = new TestProtocolPlugin(peerId.asBuffer());
  const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId, plugin);
  await networkManager.openSwarmConnection({ topic, peerId, protocol: protocolProvider, topology });

  return {
    networkManager,
    plugin
  };
};

// const createMemoryNetworkManager = (signalContext: MemorySignalManagerContext) => {
//   return new NetworkManager({
//     signalManager: new MemorySignalManager(signalContext),
//     transportFactory: MemoryTransportFactory
//   });
// };

// const createWebRTCNetworkManager = async (config: any, peerId: PublicKey) => {
//   const signalManager = new WebsocketSignalManager(signalHosts!);
//   await signalManager.subscribeMessages(peerId);
//
//   return new NetworkManager({
//     signalManager,
//     transportFactory: createWebRTCTransportFactory(config)
//   });
// };
