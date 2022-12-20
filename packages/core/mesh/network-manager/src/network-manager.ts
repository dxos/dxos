//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger, SignalManager } from '@dxos/messaging';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { SignalConnection } from './signal';
import { Swarm, SwarmMapper } from './swarm';
import { Topology } from './topology';
import { TransportFactory } from './transport';
import { WireProtocolProvider } from './wire-protocol';

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

export enum ConnectionStatus {
  OFFLINE = 0,
  ONLINE = 1
}

export type NetworkManagerOptions = {
  transportFactory: TransportFactory;
  signalManager: SignalManager;
  log?: boolean; // Log to devtools.
};

/**
 * Manages connection to the swarm.
 */
// TODO(dmaretskyi): Rename SwarmManager.
export class NetworkManager {
  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(PublicKey.hash);
  private readonly _mappers = new ComplexMap<PublicKey, SwarmMapper>(PublicKey.hash);

  private readonly _transportFactory: TransportFactory;
  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _signalConnection: SignalConnection;
  private _connectionStatus = ConnectionStatus.ONLINE;
  private readonly _connectionLog?: ConnectionLog;

  public readonly topicsUpdated = new Event<void>();

  constructor({ transportFactory, signalManager, log }: NetworkManagerOptions) {
    this._transportFactory = transportFactory;

    // Listen for signal manager events.
    this._signalManager = signalManager;
    this._signalManager.swarmEvent.on(({ topic, swarmEvent: event }) => this._swarms.get(topic)?.onSwarmEvent(event));
    this._messenger = new Messenger({ signalManager: this._signalManager });
    this._signalConnection = {
      join: (opts) => this._signalManager.join(opts),
      leave: (opts) => this._signalManager.leave(opts)
    };

    // TODO(burdon): Inject listener (generic pattern).
    if (log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  // TODO(burdon): Remove access (Devtools only).
  get connectionLog() {
    return this._connectionLog;
  }

  // TODO(burdon): Remove access (Devtools only).
  get signalManager() {
    return this._signalManager;
  }

  get connectionStatus() {
    return this._connectionStatus;
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
  async joinSwarm({
    topic,
    peerId,
    topology,
    protocolProvider: protocol,
    label
  }: SwarmOptions): Promise<SwarmConnection> {
    assert(PublicKey.isPublicKey(topic));
    assert(PublicKey.isPublicKey(peerId));
    assert(topology);
    assert(typeof protocol === 'function');
    if (this._swarms.has(topic)) {
      throw new Error(`Already connected to swarm: ${PublicKey.from(topic)}`);
    }

    log('joining', { topic: PublicKey.from(topic), peerId, topology: topology.toString() }); // TODO(burdon): Log peerId.
    const swarm = new Swarm(topic, peerId, topology, protocol, this._messenger, this._transportFactory, label);
    swarm.errors.handle((error) => {
      log('swarm error', { error });
    });

    this._swarms.set(topic, swarm);
    this._signalConnection.join({ topic, peerId }).catch((error) => log.catch(error));
    this._mappers.set(topic, new SwarmMapper(swarm));

    this.topicsUpdated.emit();
    this._connectionLog?.swarmJoined(swarm);
    log('joined', { topic: PublicKey.from(topic), count: this._swarms.size });

    return {
      close: () => this.leaveSwarm(topic)
    };
  }

  /**
   * Close the connection.
   */
  async leaveSwarm(topic: PublicKey) {
    if (!this._swarms.has(topic)) {
      log.warn('swarm not open', { topic: PublicKey.from(topic) });
      return;
    }

    log('leaving', { topic: PublicKey.from(topic) });
    const swarm = this._swarms.get(topic)!;
    await this._signalConnection.leave({ topic, peerId: swarm.ownPeerId });

    const map = this._mappers.get(topic)!;
    map.destroy();
    this._mappers.delete(topic);

    this._connectionLog?.swarmLeft(swarm);

    await swarm.destroy();
    this._swarms.delete(topic);

    await this.topicsUpdated.emit();
    log('left', { topic: PublicKey.from(topic), count: this._swarms.size });
  }

  async setConnectionStatus(status: ConnectionStatus) {
    switch (status) {
      case this._connectionStatus: {
        break;
      }
      case ConnectionStatus.OFFLINE: {
        this._connectionStatus = status;
        // go offline
        this._messenger.close();
        await this._signalManager.close();
        await Promise.all([...this._swarms.values()].map((swarm) => swarm.goOffline()));
        break;
      }
      case ConnectionStatus.ONLINE: {
        this._connectionStatus = status;
        // go online
        this._messenger.open();
        await this._signalManager.open();
        await Promise.all([...this._swarms.values()].map((swarm) => swarm.goOnline()));
        break;
      }
    }
  }
}
