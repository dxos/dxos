//
// Copyright 2020 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger, type SignalManager } from '@dxos/messaging';
import { trace } from '@dxos/protocols';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { type SignalConnection } from './signal';
import { Swarm, SwarmMapper, ConnectionLimiter } from './swarm';
import { type Topology } from './topology';
import { type TransportFactory } from './transport';
import { type WireProtocolProvider } from './wire-protocol';
/**
 * Represents a single connection to a remote peer.
 */
export type SwarmConnection = {
  close(): Promise<void>;
};

// TODO(burdon): Add timeout.
export type SwarmOptions = {
  /**
   * Swarm topic.
   */
  topic: PublicKey;

  /**
   * This node's peer id.
   */
  peerId: PublicKey;

  /**
   * Protocol to use for every connection.
   */
  protocolProvider: WireProtocolProvider;

  /**
   * Requested topology. Must be a new instance for every swarm.
   */
  topology?: Topology;

  /**
   * Custom label assigned to this swarm.
   * Used in devtools to display human-readable names for swarms.
   */
  label?: string;
};

export type SwarmNetworkManagerOptions = {
  transportFactory: TransportFactory;
  signalManager: SignalManager;
  log?: boolean; // Log to devtools.
};

/**
 * Manages p2p connection to the swarm.
 */
export class SwarmNetworkManager {
  /**
   * @internal
   */
  readonly _swarms = new ComplexMap<PublicKey, Swarm>(PublicKey.hash);
  private readonly _mappers = new ComplexMap<PublicKey, SwarmMapper>(PublicKey.hash);

  private readonly _transportFactory: TransportFactory;
  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _signalConnection: SignalConnection;
  private readonly _connectionLimiter: ConnectionLimiter;
  private readonly _connectionLog?: ConnectionLog;
  private readonly _instanceId = PublicKey.random().toHex();

  private _connectionState = ConnectionState.ONLINE;
  public readonly connectionStateChanged = new Event<ConnectionState>();
  public readonly topicsUpdated = new Event<void>();

  constructor({ transportFactory, signalManager, log }: SwarmNetworkManagerOptions) {
    this._transportFactory = transportFactory;

    // Listen for signal manager events.
    this._signalManager = signalManager;
    this._signalManager.swarmEvent.on(({ topic, swarmEvent: event }) => this._swarms.get(topic)?.onSwarmEvent(event));
    this._messenger = new Messenger({ signalManager: this._signalManager });
    this._signalConnection = {
      join: (opts) => this._signalManager.join(opts),
      leave: (opts) => this._signalManager.leave(opts),
    };

    this._connectionLimiter = new ConnectionLimiter();
    // TODO(burdon): Inject listener (generic pattern).
    if (log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  // TODO(burdon): Remove access (Devtools only).
  get connectionLog() {
    return this._connectionLog;
  }

  get connectionState() {
    return this._connectionState;
  }

  // TODO(burdon): Reconcile with "discovery_key".
  get topics() {
    return Array.from(this._swarms.keys());
  }

  getSwarmMap(topic: PublicKey): SwarmMapper | undefined {
    return this._mappers.get(topic);
  }

  getSwarm(topic: PublicKey): Swarm | undefined {
    return this._swarms.get(topic);
  }

  async open() {
    log.trace('dxos.mesh.network-manager.open', trace.begin({ id: this._instanceId }));
    await this._messenger.open();
    await this._signalManager.open();
    log.trace('dxos.mesh.network-manager.open', trace.end({ id: this._instanceId }));
  }

  async close() {
    for (const topic of this._swarms.keys()) {
      await this.leaveSwarm(topic).catch((err) => {
        log(err);
      });
    }

    await this._messenger.close();
    await this._signalManager.close();
  }

  /**
   * Join the swarm.
   */
  @synchronized
  async joinSwarm({
    topic,
    peerId,
    topology,
    protocolProvider: protocol,
    label,
  }: SwarmOptions): Promise<SwarmConnection> {
    invariant(PublicKey.isPublicKey(topic));
    invariant(PublicKey.isPublicKey(peerId));
    invariant(topology);
    invariant(typeof protocol === 'function');
    if (this._swarms.has(topic)) {
      throw new Error(`Already connected to swarm: ${PublicKey.from(topic)}`);
    }

    log('joining', { topic: PublicKey.from(topic), peerId, topology: topology.toString() }); // TODO(burdon): Log peerId.
    const swarm = new Swarm(
      topic,
      peerId,
      topology,
      protocol,
      this._messenger,
      this._transportFactory,
      label,
      this._connectionLimiter,
    );

    swarm.errors.handle((error) => {
      log('swarm error', { error });
    });

    this._swarms.set(topic, swarm);
    this._mappers.set(topic, new SwarmMapper(swarm));

    // Open before joining.
    await swarm.open();

    this._signalConnection.join({ topic, peerId }).catch((error) => log.catch(error));

    this.topicsUpdated.emit();
    this._connectionLog?.joinedSwarm(swarm);
    log('joined', { topic: PublicKey.from(topic), count: this._swarms.size });

    return {
      close: () => this.leaveSwarm(topic),
    };
  }

  /**
   * Close the connection.
   */
  @synchronized
  async leaveSwarm(topic: PublicKey) {
    if (!this._swarms.has(topic)) {
      // log.warn('swarm not open', { topic: PublicKey.from(topic).truncate() });
      return;
    }

    log('leaving', { topic: PublicKey.from(topic) });
    const swarm = this._swarms.get(topic)!;
    await this._signalConnection.leave({ topic, peerId: swarm.ownPeerId });

    const map = this._mappers.get(topic)!;
    map.destroy();
    this._mappers.delete(topic);

    this._connectionLog?.leftSwarm(swarm);

    await swarm.destroy();
    this._swarms.delete(topic);

    await this.topicsUpdated.emit();
    log('left', { topic: PublicKey.from(topic), count: this._swarms.size });
  }

  async setConnectionState(state: ConnectionState) {
    if (state === this._connectionState) {
      return;
    }

    switch (state) {
      case ConnectionState.OFFLINE: {
        this._connectionState = state;
        // go offline
        await Promise.all([...this._swarms.values()].map((swarm) => swarm.goOffline()));
        await this._messenger.close();
        await this._signalManager.close();
        break;
      }
      case ConnectionState.ONLINE: {
        this._connectionState = state;
        // go online
        this._messenger.open();
        await Promise.all([...this._swarms.values()].map((swarm) => swarm.goOnline()));
        await this._signalManager.open();
        break;
      }
    }

    this.connectionStateChanged.emit(this._connectionState);
  }
}
