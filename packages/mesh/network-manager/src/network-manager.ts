//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { GreetingCommandPlugin, ERR_GREET_ALREADY_CONNECTED_TO_SWARM } from '@dxos/credentials';
import { Protocol, ERR_EXTENSION_RESPONSE_FAILED } from '@dxos/mesh-protocol';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { SignalMessage } from './proto/gen/dxos/mesh/signalMessage';
import { InMemorySignalManager, SignalManager, WebsocketSignalManager } from './signal';
import { MessageRouter } from './signal/message-router';
import { Swarm, SwarmMapper } from './swarm';
import { Topology } from './topology';
import { createWebRTCTransportFactory, inMemoryTransportFactory } from './transport';

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

/**
 * TODO(burdon): Comment.
 */
export class NetworkManager {
  private readonly _ice?: any[];
  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(key => key.toHex());
  private readonly _maps = new ComplexMap<PublicKey, SwarmMapper>(key => key.toHex());
  private readonly _signalManager: SignalManager;
  private readonly _messageRouter: MessageRouter;
  private readonly _connectionLog?: ConnectionLog;

  public readonly topicsUpdated = new Event<void>();

  constructor (options: NetworkManagerOptions = {}) {
    this._ice = options.ice ?? [];

    const onOffer = async (message: SignalMessage) =>
      await this._swarms.get(message.topic!)?.onOffer(message) ?? { accept: false };

    this._signalManager = options.signal
      ? new WebsocketSignalManager(options.signal, onOffer)
      : new InMemorySignalManager(onOffer);

    this._signalManager.peerCandidatesChanged
      .on(([topic, candidates]) => this._swarms.get(topic)?.onPeerCandidatesChanged(candidates));

    this._signalManager.onSignal.on(msg => this._messageRouter.receiveMessage(msg));

    this._messageRouter = new MessageRouter({
      sendMessage: msg => this._signalManager.signal(msg),
      onSignal: async (msg) => this._swarms.get(msg.topic!)?.onSignal(msg),
      onOffer: msg => onOffer(msg)
    });

    if (options.log) {
      this._connectionLog = new ConnectionLog();
    }
  }

  get signal () {
    return this._signalManager;
  }

  // TODO(burdon): Reconcile with "discoveryKey".
  get topics () {
    return Array.from(this._swarms.keys());
  }

  get connectionLog () {
    return this._connectionLog;
  }

  getSwarmMap (topic: PublicKey): SwarmMapper | undefined {
    return this._maps.get(topic);
  }

  getSwarm (topic: PublicKey): Swarm | undefined {
    return this._swarms.get(topic);
  }

  joinProtocolSwarm (options: SwarmOptions) {
    // TODO(burdon): Use TS to constrain properties.
    assert(typeof options === 'object');
    const { topic, peerId, topology, protocol, presence } = options;
    assert(PublicKey.isPublicKey(topic));
    assert(PublicKey.isPublicKey(peerId));
    assert(topology);
    assert(typeof protocol === 'function');

    log(`Join ${options.topic} as ${options.peerId} with ${options.topology.toString()} topology.`);
    if (this._swarms.has(topic)) {
      throw new ERR_EXTENSION_RESPONSE_FAILED(
        GreetingCommandPlugin.EXTENSION_NAME, ERR_GREET_ALREADY_CONNECTED_TO_SWARM, `Already connected to swarm ${topic}`);
    }

    // TODO(burdon): Require factory (i.e., don't make InMemorySignalManager by default).
    // TODO(burdon): Bundle common transport related classes.
    const transportFactory = this._signalManager instanceof InMemorySignalManager
      ? inMemoryTransportFactory : createWebRTCTransportFactory({ iceServers: this._ice });

    const swarm = new Swarm(
      topic,
      peerId,
      topology,
      protocol,
      this._messageRouter,
      this._signalManager.lookup.bind(this._signalManager),
      transportFactory,
      options.label
    );

    swarm.errors.handle(error => {
      log(`Swarm error: ${error}`);
    });

    this._swarms.set(topic, swarm);
    this._signalManager.join(topic, peerId);
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

    this._signalManager.leave(topic, swarm.ownPeerId);

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
      await this.leaveProtocolSwarm(topic).catch(err => {
        log(`Failed to leave swarm ${topic} on NetworkManager.destroy}`);
        log(err);
      });
    }

    await this._messageRouter.destroy();
    await this._signalManager.destroy();
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
  presence?: any /* Presence. */

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  label?: string
}
