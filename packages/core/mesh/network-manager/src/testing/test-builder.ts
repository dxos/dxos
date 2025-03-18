//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, type SignalManager } from '@dxos/messaging';
import { schema } from '@dxos/protocols/proto';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { createLinkedPorts, createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';

import { TcpTransportFactory } from '#tcp-transport';
import { type TestTeleportExtensionFactory, TestWireProtocol } from './test-wire-protocol';
import { SwarmNetworkManager } from '../network-manager';
import { FullyConnectedTopology } from '../topology';
import { MemoryTransportFactory, type TransportFactory, TransportKind } from '../transport';
import { createRtcTransportFactory, RtcTransportProxyFactory, RtcTransportService } from '../transport';

// Signal server will be started by the setup script.

export type TestBuilderOptions = {
  transport?: TransportKind;
};

/**
 * Builder used to construct networks and peers.
 */
export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();

  constructor(public readonly options: TestBuilderOptions = {}) {}

  createSignalManager() {
    return new MemorySignalManager(this._signalContext);
  }

  createPeer(peerId: string = PublicKey.random().toHex()) {
    return new TestPeer(this, peerId, this.options.transport);
  }
}

/**
 * Testing network peer.
 */
export class TestPeer {
  private readonly _swarms = new Map<string, TestSwarmConnection>();

  /**
   * @internal
   */
  readonly _signalManager: SignalManager;

  /**
   * @internal
   */
  readonly _networkManager: SwarmNetworkManager;

  private _proxy?: ProtoRpcPeer<any>;
  private _service?: ProtoRpcPeer<any>;

  constructor(
    private readonly testBuilder: TestBuilder,
    public readonly peerId: string,
    public readonly transport: TransportKind = TransportKind.MEMORY,
  ) {
    this._signalManager = this.testBuilder.createSignalManager();
    this._networkManager = this.createNetworkManager(this.transport);
    this._networkManager.setPeerInfo({ identityKey: this.peerId, peerKey: this.peerId });
  }

  // TODO(burdon): Move to TestBuilder.
  createNetworkManager(transport: TransportKind) {
    let transportFactory: TransportFactory;
    log.info(`using ${transport} transport with signal server.`);
    switch (transport) {
      case TransportKind.MEMORY:
        transportFactory = MemoryTransportFactory;
        break;
      case TransportKind.TCP:
        transportFactory = TcpTransportFactory;
        break;
      case TransportKind.WEB_RTC:
        transportFactory = createRtcTransportFactory();
        break;
      case TransportKind.WEB_RTC_PROXY:
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
            handlers: { BridgeService: new RtcTransportService() },
            noHandshake: true,
            encodingOptions: {
              preserveAny: true,
            },
          });

          transportFactory = new RtcTransportProxyFactory().setBridgeService(this._proxy.rpc.BridgeService);
        }
        break;
      default:
        throw new Error(`Unsupported transport: ${transport}`);
    }

    return new SwarmNetworkManager({
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

  getSwarm(swarmKey: string): TestSwarmConnection {
    const swarm = this._swarms.get(swarmKey);
    if (!swarm) {
      throw new Error(`Swarm not found for swarmKey: ${swarmKey}`);
    }

    return swarm;
  }

  createSwarm(swarmKey: string, extensionFactory: TestTeleportExtensionFactory = () => []): TestSwarmConnection {
    // TODO(burdon): Multiple.
    // if (this._swarms.get(topic)) {
    //   throw new Error(`Swarm already exists for topic: ${topic.truncate()}`);
    // }

    const swarm = new TestSwarmConnection(this, swarmKey, extensionFactory);
    this._swarms.set(swarmKey, swarm);
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
    readonly swarmKey: string,
    readonly extensionFactory: TestTeleportExtensionFactory,
  ) {
    // TODO(burdon): Configure plugins.
    // TODO(burdon): Prevent reuse?
    this.protocol = new TestWireProtocol(this.extensionFactory);
  }

  // TODO(burdon): Need to create new plugin instance per swarm?
  //  If so, then perhaps joinSwarm should return swarm object with access to plugins.
  async join(topology = new FullyConnectedTopology()) {
    await this.peer._networkManager.joinSwarm({
      swarmKey: this.swarmKey,
      peerInfo: { peerKey: this.peer.peerId, identityKey: this.peer.peerId },
      protocolProvider: this.protocol.factory,
      topology,
    });

    return this;
  }

  async leave() {
    await this.peer._networkManager.leaveSwarm(this.swarmKey);
    return this;
  }
}
