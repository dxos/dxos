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

import { ConnectionLog } from './connection-log.js';
import { SignalConnection } from './signal/index.js';
import { Swarm, SwarmMapper } from './swarm/index.js';
import { Topology } from './topology/index.js';
import { TransportFactory } from './transport/index.js';

export type ProtocolProvider = (opts: {
  channel: Buffer
  initiator: boolean
}) => Protocol;

export interface NetworkManagerOptions {
  transportFactory: TransportFactory
  signalManager: SignalManager
  /**
   * Enable connection logging for devtools.
   */
  log?: boolean
}

/**
 * Manages connection to the swarm.
 */
export class NetworkManager {
  private readonly _transportFactory: TransportFactory;

  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(key => key.toHex());
  private readonly _maps = new ComplexMap<PublicKey, SwarmMapper>(key => key.toHex());

  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _signalConnection: SignalConnection;
  private readonly _connectionLog?: ConnectionLog;

  public readonly topicsUpdated = new Event<void>();

  constructor ({
    transportFactory,
    signalManager,
    log
  }: NetworkManagerOptions) {
    this._transportFactory = transportFactory;

    // Listen for signal manager events.
    {
      this._signalManager = signalManager;

      this._signalManager.swarmEvent.on(({ topic, swarmEvent: event }) =>
        this._swarms.get(topic)?.onSwarmEvent(event)
      );
    }
    this._messenger = new Messenger({ signalManager: this._signalManager });

    this._signalConnection = {
      join: (opts) => this._signalManager.join(opts),
      leave: (opts) => this._signalManager.leave(opts)
    };

    if (log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  get signal () {
    return this._signalManager;
  }

  // TODO(burdon): Reconcile with "discovery_key".
  get topics () {
    return Array.from(this._swarms.keys());
  }

  // TODO(burdon): Factor out devtools.
  get connectionLog () {
    return this._connectionLog;
  }

  getSwarmMap (topic: PublicKey): SwarmMapper | undefined {
    return this._maps.get(topic);
  }

  getSwarm (topic: PublicKey): Swarm | undefined {
    return this._swarms.get(topic);
  }

  async joinProtocolSwarm (options: SwarmOptions) {
    // TODO(burdon): Use TS to constrain properties.
    assert(typeof options === 'object');
    const { topic, peerId, topology, protocol, presence } = options;
    assert(PublicKey.isPublicKey(topic));
    assert(PublicKey.isPublicKey(peerId));
    assert(topology);
    assert(typeof protocol === 'function');

    log(`Join ${options.topic} as ${options.peerId} with ${options.topology.toString()} topology.`);
    if (this._swarms.has(topic)) {
      throw new Error(`Already connected to swarm ${topic}`);
    }

    const swarm = new Swarm(
      topic,
      peerId,
      topology,
      protocol,
      this._messenger,
      this._transportFactory,
      options.label
    );

    swarm.errors.handle((error) => {
      log(`Swarm error: ${error}`);
    });

    this._swarms.set(topic, swarm);
    this._signalConnection
      .join({ topic, peerId })
      .catch((error) => log(`Error: ${error}`));
    this._maps.set(topic, new SwarmMapper(swarm, presence));

    this.topicsUpdated.emit();

    this._connectionLog?.swarmJoined(swarm);

    return () => this.leaveProtocolSwarm(topic);
  }

  async leaveProtocolSwarm (topic: PublicKey) {
    log(`Leave ${topic}`);

    if (!this._swarms.has(topic)) {
      return;
    }

    const map = this._maps.get(topic)!;
    const swarm = this._swarms.get(topic)!;

    await this._signalConnection.leave({ topic, peerId: swarm.ownPeerId });

    map.destroy();
    this._maps.delete(topic);

    this._connectionLog?.swarmLeft(swarm);

    await swarm.destroy();
    this._swarms.delete(topic);

    await this.topicsUpdated.emit();
  }

  /**
   * @deprecated
   */
  // TODO(marik-d): Remove.
  async start () {
    console.warn('NetworkManger.start is deprecated.');
  }

  async destroy () {
    for (const topic of this._swarms.keys()) {
      await this.leaveProtocolSwarm(topic).catch((err) => {
        log(`Failed to leave swarm ${topic} on NetworkManager.destroy}`);
        log(err);
      });
    }

    await this._signalManager.destroy();
  }
}

export interface SwarmOptions {
  /**
   * Swarm topic.
   */
  topic: PublicKey

  /**
   * This node's peer id.
   */
  peerId: PublicKey

  /**
   * Requested topology. Must be a new instance for every swarm.
   */
  topology: Topology

  /**
   * Protocol to use for every connection.
   */
  protocol: ProtocolProvider

  /**
   * Presence plugin for network mapping, if exists.
   */
  presence?: any

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  label?: string
}
