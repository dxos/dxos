//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { schema } from '@dxos/protocols';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';
import { ComplexSet } from '@dxos/util';

import { NetworkManager } from '../network-manager';
import { FullyConnectedTopology, Topology } from '../topology';
import {
  MemoryTransportFactory,
  TransportFactory,
  WebRTCTransportProxyFactory,
  WebRTCTransportService
} from '../transport';
import { TestProtocolPlugin, testProtocolProvider } from './test-protocol';

// Signal server will be started by the setup script.
export const TEST_SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

export type TestBuilderOptions = {
  signalHosts?: string[];
};

/**
 * Builder used to construct networks and peers.
 */
export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();

  constructor(public readonly options: TestBuilderOptions = {}) {}

  createSignalManager() {
    if (this.options.signalHosts) {
      return new WebsocketSignalManager(this.options.signalHosts);
    }

    return new MemorySignalManager(this._signalContext);
  }

  createPeer(options: TestPeerOptions = {}) {
    return new TestPeer(this, options);
  }
}

export type TestPeerOptions = {
  bridge?: boolean;
};

/**
 * Testing network peer.
 */
export class TestPeer {
  readonly peerId = PublicKey.random();

  // TODO(burdon): Configure plugins.
  readonly plugin = new TestProtocolPlugin(this.peerId.asBuffer()); // TODO(burdon): PublicKey.

  private readonly _swarms = new ComplexSet<PublicKey>(PublicKey.hash);
  private readonly _networkManager: NetworkManager;
  private readonly _client?: ProtoRpcPeer<any>;
  private readonly _server?: ProtoRpcPeer<any>;

  constructor(testBuilder: TestBuilder, options: TestPeerOptions = {}) {
    let transportFactory: TransportFactory = MemoryTransportFactory;
    if (testBuilder.options.signalHosts) {
      const webrtcTransportFactory = new WebRTCTransportProxyFactory();

      // TODO(burdon): Explain what we're doing here.
      if (options.bridge) {
        const [clientPort, serverPort] = createLinkedPorts();

        this._client = createProtoRpcPeer({
          port: clientPort,
          requested: {
            BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
          },
          noHandshake: true,
          encodingOptions: {
            preserveAny: true
          }
        });

        this._server = createProtoRpcPeer({
          port: serverPort,
          exposed: {
            BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
          },
          handlers: { BridgeService: new WebRTCTransportService() },
          noHandshake: true,
          encodingOptions: {
            preserveAny: true
          }
        });

        webrtcTransportFactory.setBridgeService(this._client.rpc.BridgeService);
      }

      transportFactory = webrtcTransportFactory;
    }

    this._networkManager = new NetworkManager({
      signalManager: testBuilder.createSignalManager(),
      transportFactory
    });
  }

  async open() {
    await this._client?.open();
    await this._server?.open();
  }

  async close() {
    await Promise.all(Array.from(this._swarms.values()).map((topic) => this.leaveSwarm(topic)));
    this._swarms.clear();

    await this._client?.close();
    await this._server?.close();
    await this._networkManager.close();
  }

  // TODO(burdon): Need to create new plugin instance per swarm?
  //  If so, then perhaps joinSwarm should return swarm object with access to plugins.
  async joinSwarm(topic: PublicKey, topology = new FullyConnectedTopology()) {
    await this._networkManager.joinSwarm({
      topic,
      peerId: this.peerId,
      protocol: testProtocolProvider(topic.asBuffer(), this.peerId, this.plugin),
      topology
    });

    this._swarms.add(topic);
  }

  async leaveSwarm(topic: PublicKey) {
    await this._networkManager.leaveSwarm(topic);
    this._swarms.delete(topic);
  }
}

//
// TODO(burdon): Remove.
//

const signalContext = new MemorySignalManagerContext();

export interface CreatePeerOptions {
  topic: PublicKey;
  peerId: PublicKey;
  topology?: Topology;
  signalHosts?: string[];
  transportFactory: TransportFactory;
}

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

  afterTest(() => networkManager.close());

  // TODO(burdon): Use keys everywhere.
  const plugin = new TestProtocolPlugin(peerId.asBuffer());
  const protocolProvider = testProtocolProvider(topic.asBuffer(), peerId, plugin);
  await networkManager.joinSwarm({ topic, peerId, protocol: protocolProvider, topology });

  return {
    networkManager,
    plugin
  };
};
