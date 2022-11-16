//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { Messenger, SignalManager } from '@dxos/messaging';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { SignalConnection } from './signal';
import { Swarm, SwarmMapper } from './swarm';
import { Topology } from './topology';
import { TransportFactory } from './transport';

export type ProtocolProvider = (opts: { channel: Buffer; initiator: boolean }) => Protocol;

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
  protocol: ProtocolProvider;

  /**
   * Requested topology. Must be a new instance for every swarm.
   */
  topology?: Topology;

  /**
   * Presence plugin for network mapping, if exists.
   */
  presence?: any;

  /**
   * Custom label assigned to this swarm.
   * Used in devtools to display human-readable names for swarms.
   */
  label?: string;
};

export type NetworkManagerOptions = {
  transportFactory: TransportFactory;
  signalManager: SignalManager;
  log?: boolean; // Log to devtools.
};

/**
 * Manages connection to the swarm.
 */
export class NetworkManager {
  private readonly _transportFactory: TransportFactory;

  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(PublicKey.hash);
  private readonly _mappers = new ComplexMap<PublicKey, SwarmMapper>(PublicKey.hash);

  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _signalConnection: SignalConnection;
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

    if (log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  get signal() {
    return this._signalManager;
  }

  // TODO(burdon): Reconcile with "discovery_key".
  get topics() {
    return Array.from(this._swarms.keys());
  }

  // TODO(burdon): Factor out devtools.
  get connectionLog() {
    return this._connectionLog;
  }

  getSwarmMap(topic: PublicKey): SwarmMapper | undefined {
    return this._mappers.get(topic);
  }

  getSwarm(topic: PublicKey): Swarm | undefined {
    return this._swarms.get(topic);
  }

  /**
   * Join the swarm.
   */
  // TODO(burdon): Join/Open?
  async openSwarmConnection({
    topic,
    peerId,
    topology,
    protocol,
    presence,
    label
  }: SwarmOptions): Promise<SwarmConnection> {
    assert(PublicKey.isPublicKey(topic));
    assert(PublicKey.isPublicKey(peerId));
    assert(topology);
    assert(typeof protocol === 'function');
    if (this._swarms.has(topic)) {
      throw new Error(`Already connected to swarm: ${topic}`);
    }

    log('joining', { topic, peerId, topology: topology.toString() });
    const swarm = new Swarm(topic, peerId, topology, protocol, this._messenger, this._transportFactory, label);
    swarm.errors.handle((error) => {
      log(`Swarm error: ${error}`);
    });

    this._swarms.set(topic, swarm);
    this._signalConnection.join({ topic, peerId }).catch((error) => log.catch(error));
    this._mappers.set(topic, new SwarmMapper(swarm, presence));

    this.topicsUpdated.emit();
    this._connectionLog?.swarmJoined(swarm);
    log('open', { topic });

    return {
      close: () => this.closeSwarmConnection(topic)
    };
  }

  /**
   * Close the connection.
   */
  async closeSwarmConnection(topic: PublicKey) {
    if (!this._swarms.has(topic)) {
      log.warn('swarm not open', { topic });
      return;
    }

    log('closing', { topic });
    const swarm = this._swarms.get(topic)!;
    await this._signalConnection.leave({ topic, peerId: swarm.ownPeerId });

    const map = this._mappers.get(topic)!;
    map.destroy();
    this._mappers.delete(topic);

    this._connectionLog?.swarmLeft(swarm);

    await swarm.destroy();
    this._swarms.delete(topic);

    await this.topicsUpdated.emit();
    log('closed', { topic });
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  async start() {
    console.warn('NetworkManger.start is deprecated.');
  }

  // TODO(burdon): Open/close?
  async destroy() {
    for (const topic of this._swarms.keys()) {
      await this.closeSwarmConnection(topic).catch((err) => {
        log(`Failed to leave swarm ${topic} on NetworkManager.destroy}`);
        log(err);
      });
    }

    await this._signalManager.destroy();
  }
}
