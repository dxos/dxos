//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { GreetingCommandPlugin, ERR_GREET_ALREADY_CONNECTED_TO_SWARM } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { Protocol, ERR_EXTENSION_RESPONSE_FAILED } from '@dxos/protocol';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { InMemorySignalManager, SignalManager, SignalApi, WebsocketSignalManager } from './signal';
import { Swarm, SwarmMapper } from './swarm';
import { Topology } from './topology';
import { createWebRtcTransportFactory, inMemoryTransportFactory } from './transport';

export type ProtocolProvider = (opts: { channel: Buffer, initiator: boolean}) => Protocol;

export interface NetworkManagerOptions {
  signal?: string[],
  ice?: any[],
  /**
   * Enable connection logging for devtools.
   */
  log?: boolean
}

const log = debug('dxos:network-manager');

export class NetworkManager {
  private readonly _ice?: any[];

  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(x => x.toHex());

  private readonly _maps = new ComplexMap<PublicKey, SwarmMapper>(x => x.toHex());

  private readonly _signal: SignalManager;

  private readonly _connectionLog?: ConnectionLog;

  public readonly topicsUpdated = new Event<void>();

  get signal () {
    return this._signal;
  }

  get topics () {
    return Array.from(this._swarms.keys());
  }

  get connectionLog () {
    return this._connectionLog;
  }

  constructor (options: NetworkManagerOptions = {}) {
    this._ice = options.ice ?? [];

    const onOffer = async (msg: SignalApi.SignalMessage) => await this._swarms.get(msg.topic)?.onOffer(msg) ?? { accept: false };

    this._signal = options.signal
      ? new WebsocketSignalManager(options.signal, onOffer)
      : new InMemorySignalManager(onOffer);

    this._signal.peerCandidatesChanged.on(([topic, candidates]) => this._swarms.get(topic)?.onPeerCandidatesChanged(candidates));
    this._signal.onSignal.on(msg => this._swarms.get(msg.topic)?.onSignal(msg));

    if (options.log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  getSwarmMap (topic: PublicKey): SwarmMapper | undefined {
    return this._maps.get(topic);
  }

  getSwarm (topic: PublicKey): Swarm | undefined {
    return this._swarms.get(topic);
  }

  joinProtocolSwarm (options: SwarmOptions) {
    assert(typeof options === 'object', 'Incorrect arguments format.');
    const { topic, peerId, topology, protocol, presence } = options;
    assert(PublicKey.isPublicKey(topic), 'Incorrect arguments format.');
    assert(PublicKey.isPublicKey(peerId), 'Incorrect arguments format.');
    assert(topology, 'Incorrect arguments format.');
    assert(typeof protocol === 'function', 'Incorrect arguments format.');
    log(`Join ${options.topic} as ${options.peerId} with ${options.topology.toString()} topology.`);

    if (this._swarms.has(topic)) {
      throw new ERR_EXTENSION_RESPONSE_FAILED(GreetingCommandPlugin.EXTENSION_NAME, ERR_GREET_ALREADY_CONNECTED_TO_SWARM, `Already connected to swarm ${topic}`);
    }

    const swarm = new Swarm(
      topic,
      peerId,
      topology,
      protocol,
      async offer => this._signal.offer(offer),
      async msg => this._signal.signal(msg),
      () => {
        this._signal.lookup(topic);
      },
      this._signal instanceof InMemorySignalManager ? inMemoryTransportFactory : createWebRtcTransportFactory({ iceServers: this._ice }),
      options.label
    );

    this._swarms.set(topic, swarm);
    this._signal.join(topic, peerId);
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

    this._signal.leave(topic, swarm.ownPeerId);

    map.destroy();
    this._maps.delete(topic);

    this._connectionLog?.swarmLeft(swarm);

    await swarm.destroy();
    this._swarms.delete(topic);
    this.topicsUpdated.emit();
  }

  // TODO(marik-d): Remove.
  /**
   * @default
   */
  async start () {
    console.warn('NetworkManger.start is deprecated.');
  }

  async destroy () {
    for (const topic of this._swarms.keys()) {
      await this.leaveProtocolSwarm(topic).catch(err => {
        log(`Failed to leave swarm ${topic} on NetworkManager.destroy}`);
        log(err);
      });
    }
    await this._signal.destroy();
  }
}

export interface SwarmOptions {
  /**
   * Swarm topic.
   */
  topic: PublicKey,
  /**
   * This node's peer id.
   */
  peerId: PublicKey,

  /**
   * Requested topology. Must be a new instance for every swarm.
   */
  topology: Topology,

  /**
   * Protocol to use for every connection.
   */
  protocol: ProtocolProvider,

  /**
   * Presence plugin for network mapping, if exists.
   */
  presence?: any /* Presence */

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  label?: string
}
