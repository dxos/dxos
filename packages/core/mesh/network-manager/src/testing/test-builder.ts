//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  SignalManager,
  WebsocketSignalManager,
} from '@dxos/messaging';
import { schema } from '@dxos/protocols';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';

import { NetworkManager } from '../network-manager';
import { FullyConnectedTopology } from '../topology';
import {
  MemoryTransportFactory,
  TransportFactory,
  WebRTCTransport,
  WebRTCTransportProxyFactory,
  WebRTCTransportService,
} from '../transport';
import { TestWireProtocol } from './test-wire-protocol';

// Signal server will be started by the setup script.
const port = process.env.SIGNAL_PORT ?? 4000;
export const TEST_SIGNAL_HOSTS: Runtime.Services.Signal[] = [
  { server: `ws://localhost:${port}/.well-known/dx/signal` },
];

export type TestBuilderOptions = {
  signalHosts?: Runtime.Services.Signal[];
  bridge?: boolean;
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

  createPeer() {
    return new TestPeer(this);
  }
}

/**
 * Testing network peer.
 */
export class TestPeer {
  readonly peerId = PublicKey.random();

  private readonly _swarms = new ComplexMap<PublicKey, TestSwarmConnection>(PublicKey.hash);

  /**
   * @internal
   */
  readonly _signalManager: SignalManager;

  /**
   * @internal
   */
  readonly _networkManager: NetworkManager;

  private _proxy?: ProtoRpcPeer<any>;
  private _service?: ProtoRpcPeer<any>;

  constructor(private readonly testBuilder: TestBuilder) {
    this._signalManager = this.testBuilder.createSignalManager();
    this._networkManager = this.createNetworkManager();
  }

  // TODO(burdon): Move to TestBuilder.
  createNetworkManager() {
    let transportFactory: TransportFactory = MemoryTransportFactory;

    if (this.testBuilder.options.signalHosts) {
      if (this.testBuilder.options.bridge) {
        // Simulates bridge to shared worker.
        const [proxyPort, servicePort] = createLinkedPorts();

        this._proxy = createProtoRpcPeer({
          port: proxyPort,
          requested: {
            BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
          },
          noHandshake: true,
          encodingOptions: {
            preserveAny: true,
          },
        });

        this._service = createProtoRpcPeer({
          port: servicePort,
          exposed: {
            BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
          },
          handlers: { BridgeService: new WebRTCTransportService() },
          noHandshake: true,
          encodingOptions: {
            preserveAny: true,
          },
        });

        transportFactory = new WebRTCTransportProxyFactory().setBridgeService(this._proxy.rpc.BridgeService);
      } else {
        transportFactory = {
          createTransport: (params) => new WebRTCTransport(params),
        };
      }
    }

    return new NetworkManager({
      signalManager: this._signalManager,
      transportFactory,
    });
  }

  async open() {
    await this._networkManager.open();
    await this._proxy?.open();
    await this._service?.open();
  }

  async close() {
    await Promise.all(Array.from(this._swarms.values()).map((swarm) => swarm.leave()));
    this._swarms.clear();

    await this._proxy?.close();
    await this._service?.close();
    await this._networkManager.close();
  }

  getSwarm(topic: PublicKey): TestSwarmConnection {
    const swarm = this._swarms.get(topic);
    if (!swarm) {
      throw new Error(`Swarm not found for topic: ${topic}`);
    }

    return swarm;
  }

  createSwarm(topic: PublicKey): TestSwarmConnection {
    // TODO(burdon): Multiple.
    // if (this._swarms.get(topic)) {
    //   throw new Error(`Swarm already exists for topic: ${topic.truncate()}`);
    // }

    const swarm = new TestSwarmConnection(this, topic);
    this._swarms.set(topic, swarm);
    return swarm;
  }

  async goOffline() {
    await this._networkManager.setConnectionState(ConnectionState.OFFLINE);
  }

  async goOnline() {
    await this._networkManager.setConnectionState(ConnectionState.ONLINE);
  }
}

// TODO(burdon): Reconcile with new Swarm concept.
export class TestSwarmConnection {
  protocol: TestWireProtocol;

  constructor(readonly peer: TestPeer, readonly topic: PublicKey) {
    // TODO(burdon): Configure plugins.
    // TODO(burdon): Prevent reuse?
    this.protocol = new TestWireProtocol(this.peer.peerId);
  }

  // TODO(burdon): Need to create new plugin instance per swarm?
  //  If so, then perhaps joinSwarm should return swarm object with access to plugins.
  async join(topology = new FullyConnectedTopology()) {
    await this.peer._networkManager.joinSwarm({
      topic: this.topic,
      peerId: this.peer.peerId,
      protocolProvider: this.protocol.factory,
      topology,
    });

    return this;
  }

  async leave() {
    await this.peer._networkManager.leaveSwarm(this.topic);
    return this;
  }
}
