//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { ComplexMap } from '@dxos/util';

import { InMemorySignalManager, SignalManager, SignalApi, WebsocketSignalManager } from './signal';
import { SwarmMapper } from './swarm-mapper';
import { Swarm } from './swarm/swarm';
import { Topology } from './topology/topology';

export type ProtocolProvider = (opts: { channel: Buffer }) => Protocol;

export interface NetworkManagerOptions {
  signal?: string[],
  ice?: any[],
}

const log = debug('dxos:network-manager');

export class NetworkManager {
  private readonly _ice?: any[];

  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(x => x.toHex());

  private readonly _maps = new ComplexMap<PublicKey, SwarmMapper>(x => x.toHex());

  private readonly _signal: SignalManager;

  public readonly topicsUpdated = new Event<void>();

  get signal () {
    return this._signal;
  }

  get topics () {
    return Array.from(this._swarms.keys());
  }

  constructor (options: NetworkManagerOptions = {}) {
    this._ice = options.ice;

    const onOffer = async (msg: SignalApi.SignalMessage) => (await this._swarms.get(msg.topic)?.onOffer(msg)) ?? { accept: false };

    this._signal = options.signal
      ? new WebsocketSignalManager(options.signal, onOffer)
      : new InMemorySignalManager(onOffer);

    this._signal.peerCandidatesChanged.on(([topic, candidates]) => this._swarms.get(topic)?.onPeerCandidatesChanged(candidates));
    this._signal.onSignal.on(msg => this._swarms.get(msg.topic)?.onSignal(msg));
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
      throw new Error(`Already connected to swarm ${topic}`);
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
      this._signal instanceof InMemorySignalManager,
      options.label,
      { iceServers: this._ice }
    );
    this._swarms.set(topic, swarm);
    this._signal.join(topic, peerId);
    this._maps.set(topic, new SwarmMapper(swarm, presence));
    this.topicsUpdated.emit();

    return () => this.leaveProtocolSwarm(topic);
  }

  async leaveProtocolSwarm (topic: PublicKey) {
    log(`Join ${topic}`);

    if (!this._swarms.has(topic)) {
      return;
    }

    const map = this._maps.get(topic)!;
    const swarm = this._swarms.get(topic)!;

    this._signal.leave(topic, swarm.ownPeerId);

    map.destroy();
    this._maps.delete(topic);

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
    for (const swarm of this._swarms.values()) {
      await swarm.destroy().catch(err => {
        log('Failed to destroy swarm');
        log(err);
      });
    }
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
