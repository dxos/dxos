//
// Copyright 2022 DXOS.org
//

import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, type SignalManager } from '@dxos/messaging';
import { schema } from '@dxos/protocols/proto';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { type ProtoRpcPeer, createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';

import { TcpTransportFactory } from '#tcp-transport';

import { SwarmNetworkManager } from '../network-manager';
import { FullyConnectedTopology } from '../topology';
import {
  MemoryTransportFactory,
  RtcTransportProxyFactory,
  RtcTransportService,
  type TransportFactory,
  TransportKind,
  createRtcTransportFactory,
} from '../transport';
import { type TestTeleportExtensionFactory, TestWireProtocol } from './test-wire-protocol';

export type TestBuilderOptions = {
  transport?: TransportKind;
};

/**
 * Builder used to construct networks and peers.
 */
export class TestBuilder {
  private _signalContext = new MemorySignalManagerContext();

  constructor(public readonly options: TestBuilderOptions = {}) {}

  createSignalManager(): MemorySignalManager {
    // KUBE `WebsocketSignalManager` was removed; signaling is always in-memory (the shared context
    // connects peers in-process). The transport is chosen independently via `options.transport`.
    return new MemorySignalManager(this._signalContext);
  }

  createPeer(peerId: PublicKey = PublicKey.random()): TestPeer {
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
  readonly _networkManager: SwarmNetworkManager;

  private _proxy?: ProtoRpcPeer<any>;
  private _service?: ProtoRpcPeer<any>;

  constructor(
    private readonly testBuilder: TestBuilder,
    public readonly peerId: PublicKey,
    public readonly transport: TransportKind = TransportKind.MEMORY,
  ) {
    this._signalManager = this.testBuilder.createSignalManager();
    this._networkManager = this.createNetworkManager(this.transport);
    this._networkManager.setPeerInfo({ identityDid: `did:halo:${peerId.toHex()}`, peerKey: peerId.toHex() });
  }

  // TODO(burdon): Move to TestBuilder.
  createNetworkManager(transport: TransportKind): SwarmNetworkManager {
    let transportFactory: TransportFactory;
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

  async open(): Promise<void> {
    await this._networkManager.open();
    await this._proxy?.open();
    await this._service?.open();
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this._swarms.values()).map((swarm) => swarm.leave()));
    this._swarms.clear();

    await this._proxy?.close();
    await this._service?.close();
    await this._networkManager.close(Context.default());
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

  async goOffline(): Promise<void> {
    await this._networkManager.setConnectionState(ConnectionState.OFFLINE);
  }

  async goOnline(): Promise<void> {
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
    this.protocol = new TestWireProtocol(this.extensionFactory);
  }

  // TODO(burdon): Need to create new plugin instance per swarm?
  //  If so, then perhaps joinSwarm should return swarm object with access to plugins.
  async join(topology = new FullyConnectedTopology()): Promise<this> {
    await this.peer._networkManager.joinSwarm(Context.default(), {
      topic: this.topic,
      peerInfo: { peerKey: this.peer.peerId.toHex(), identityDid: `did:halo:${this.peer.peerId.toHex()}` },
      protocolProvider: this.protocol.factory,
      topology,
    });

    return this;
  }

  async leave(): Promise<this> {
    await this.peer._networkManager.leaveSwarm(Context.default(), this.topic);
    return this;
  }
}
