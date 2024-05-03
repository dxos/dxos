//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  type SignalManager,
  WebsocketSignalManager,
} from '@dxos/messaging';
import { schema } from '@dxos/protocols';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { createLinkedPorts, createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';

import { type TestTeleportExtensionFactory, TestWireProtocol } from './test-wire-protocol';
import { NetworkManager } from '../network-manager';
import { FullyConnectedTopology } from '../topology';
import {
  createLibDataChannelTransportFactory,
  createSimplePeerTransportFactory,
  MemoryTransportFactory,
  SimplePeerTransportProxyFactory,
  SimplePeerTransportService,
  type TransportFactory,
  TransportKind,
} from '../transport';
import { TcpTransportFactory } from '../transport/tcp-transport';

// Signal server will be started by the setup script.
const port = process.env.SIGNAL_PORT ?? 4000;
export const TEST_SIGNAL_HOSTS: Runtime.Services.Signal[] = [
  { server: `ws://localhost:${port}/.well-known/dx/signal` },
];

export type TestBuilderOptions = {
  signalHosts?: Runtime.Services.Signal[];
  bridge?: boolean;
  transport?: TransportKind;
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

  createPeer(peerId: PublicKey = PublicKey.random()) {
    return new TestPeer(this, peerId, this.options.transport);
  }
}

/**
 * Testing network peer.
 */
export class TestPeer {
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

  constructor(
    private readonly testBuilder: TestBuilder,
    public readonly peerId: PublicKey,
    public readonly transport?: TransportKind,
  ) {
    this._signalManager = this.testBuilder.createSignalManager();
    if (!transport) {
      if (this.testBuilder.options.signalHosts) {
        // TODO(nf): configure better
        transport = process.env.MOCHA_ENV === 'nodejs' ? TransportKind.LIBDATACHANNEL : TransportKind.SIMPLE_PEER;
      } else {
        transport = TransportKind.MEMORY;
      }
    }
    this._networkManager = this.createNetworkManager(transport);
  }

  // TODO(burdon): Move to TestBuilder.
  createNetworkManager(transport: TransportKind) {
    let transportFactory: TransportFactory;
    if (this.testBuilder.options.signalHosts) {
      log.info(`using ${transport} transport with signal server.`);
      switch (transport) {
        case TransportKind.MEMORY:
          throw new Error('Memory transport not supported with signal server.');
        case TransportKind.TCP:
          transportFactory = TcpTransportFactory;
          break;
        case TransportKind.SIMPLE_PEER:
          transportFactory = createSimplePeerTransportFactory();
          break;
        case TransportKind.LIBDATACHANNEL:
          transportFactory = createLibDataChannelTransportFactory();
          break;
        case TransportKind.SIMPLE_PEER_PROXY:
          {
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
              handlers: { BridgeService: new SimplePeerTransportService() },
              noHandshake: true,
              encodingOptions: {
                preserveAny: true,
              },
            });

            transportFactory = new SimplePeerTransportProxyFactory().setBridgeService(this._proxy.rpc.BridgeService);
          }
          break;
        default:
          throw new Error(`Unsupported transport: ${transport}`);
      }
    } else {
      if (transport !== TransportKind.MEMORY && transport !== TransportKind.TCP) {
        log.warn(`specified transport ${transport} but no signalling configured, using memory transport instead`);
      }
      log.info(`using ${transport} transport without signal server.`);
      transportFactory = MemoryTransportFactory;
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

  createSwarm(topic: PublicKey, extensionFactory: TestTeleportExtensionFactory = () => []): TestSwarmConnection {
    // TODO(burdon): Multiple.
    // if (this._swarms.get(topic)) {
    //   throw new Error(`Swarm already exists for topic: ${topic.truncate()}`);
    // }

    const swarm = new TestSwarmConnection(this, topic, extensionFactory);
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

  constructor(
    readonly peer: TestPeer,
    readonly topic: PublicKey,
    readonly extensionFactory: TestTeleportExtensionFactory,
  ) {
    // TODO(burdon): Configure plugins.
    // TODO(burdon): Prevent reuse?
    this.protocol = new TestWireProtocol(this.peer.peerId, this.extensionFactory);
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
