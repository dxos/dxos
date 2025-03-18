//
// Copyright 2020 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger, type PeerInfo, type SignalManager } from '@dxos/messaging';
import { trace } from '@dxos/protocols';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

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
   * Swarm key.
   */
  swarmKey: string;

  /**
   * This node's peer info.
   */
  peerInfo?: PeerInfo;

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
  enableDevtoolsLogging?: boolean; // Log to devtools.
  peerInfo?: PeerInfo;
};

/**
 * Manages p2p connection to the swarm.
 */
export class SwarmNetworkManager {
  /**
   * @internal
   */
  readonly _swarms = new Map<string, Swarm>();
  private readonly _mappers = new Map<string, SwarmMapper>();

  private readonly _transportFactory: TransportFactory;
  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _signalConnection: SignalConnection;
  private readonly _connectionLimiter: ConnectionLimiter;
  private readonly _connectionLog?: ConnectionLog;
  private readonly _instanceId = PublicKey.random().toHex();
  private _peerInfo?: PeerInfo = undefined;

  private _connectionState = ConnectionState.ONLINE;
  public readonly connectionStateChanged = new Event<ConnectionState>();
  public readonly swarmKeysUpdated = new Event<void>();

  constructor({ transportFactory, signalManager, enableDevtoolsLogging, peerInfo }: SwarmNetworkManagerOptions) {
    this._transportFactory = transportFactory;

    // Listen for signal manager events.
    this._signalManager = signalManager;
    this._signalManager.swarmState.on((event) => this._swarms.get(event.swarmKey)?.onSwarmState(event));
    this._messenger = new Messenger({ signalManager: this._signalManager });
    this._signalConnection = {
      join: (opts) => this._signalManager.join(opts),
      leave: (opts) => this._signalManager.leave(opts),
    };
    this._peerInfo = peerInfo;

    this._connectionLimiter = new ConnectionLimiter();
    // TODO(burdon): Inject listener (generic pattern).
    if (enableDevtoolsLogging) {
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
  get swarmKeys() {
    return Array.from(this._swarms.keys());
  }

  getSwarmMap(swarmKey: string): SwarmMapper | undefined {
    return this._mappers.get(swarmKey);
  }

  getSwarm(swarmKey: string): Swarm | undefined {
    return this._swarms.get(swarmKey);
  }

  setPeerInfo(peerInfo: PeerInfo) {
    this._peerInfo = peerInfo;
  }

  async open() {
    log.trace('dxos.mesh.network-manager.open', trace.begin({ id: this._instanceId }));
    await this._messenger.open();
    await this._signalManager.open();
    log.trace('dxos.mesh.network-manager.open', trace.end({ id: this._instanceId }));
  }

  async close() {
    for (const swarmKey of this._swarms.keys()) {
      await this.leaveSwarm(swarmKey).catch((err) => {
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
    swarmKey, //
    topology,
    protocolProvider: protocol,
    label,
  }: SwarmOptions): Promise<SwarmConnection> {
    invariant(topology);
    invariant(this._peerInfo);
    invariant(typeof protocol === 'function');
    if (this._swarms.has(swarmKey)) {
      throw new Error(`Already connected to swarm: ${swarmKey}`);
    }

    log('joining', { swarmKey, peerInfo: this._peerInfo, topology: topology.toString() }); // TODO(burdon): Log peerId.
    const swarm = new Swarm(
      swarmKey,
      this._peerInfo,
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

    this._swarms.set(swarmKey, swarm);
    this._mappers.set(swarmKey, new SwarmMapper(swarm));

    // Open before joining.
    await swarm.open();

    this._signalConnection.join({ swarmKey, peer: this._peerInfo }).catch((error) => log.catch(error));

    this.swarmKeysUpdated.emit();
    this._connectionLog?.joinedSwarm(swarm);
    log('joined', { swarmKey, count: this._swarms.size });

    return {
      close: () => this.leaveSwarm(swarmKey),
    };
  }

  /**
   * Close the connection.
   */
  @synchronized
  async leaveSwarm(swarmKey: string) {
    if (!this._swarms.has(swarmKey)) {
      // log.warn('swarm not open', { swarmKey: PublicKey.from(swarmKey).truncate() });
      return;
    }

    log('leaving', { swarmKey });
    const swarm = this._swarms.get(swarmKey)!;
    await this._signalConnection.leave({ swarmKey, peer: swarm.ownPeer });

    const map = this._mappers.get(swarmKey)!;
    map.destroy();
    this._mappers.delete(swarmKey);

    this._connectionLog?.leftSwarm(swarm);

    await swarm.destroy();
    this._swarms.delete(swarmKey);

    this.swarmKeysUpdated.emit();
    log('left', { swarmKey, count: this._swarms.size });
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
