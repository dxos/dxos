//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol, ERR_EXTENSION_RESPONSE_FAILED } from '@dxos/mesh-protocol';
import { MemorySignalManager, Messenger, SignalManager } from '@dxos/messaging';
import { ComplexMap } from '@dxos/util';

import { ConnectionLog } from './connection-log';
import { OfferMessage, MessageRouter, SignalConnection } from './signal';
import { Swarm, SwarmMapper } from './swarm';
import { Topology } from './topology';
import { createWebRTCTransportFactory, inMemoryTransportFactory } from './transport';

export type ProtocolProvider = (opts: {
  channel: Buffer
  initiator: boolean
}) => Protocol;

export interface NetworkManagerOptions {
  signalManager: SignalManager
  ice?: any[]
  /**
   * Enable connection logging for devtools.
   */
  log?: boolean
}

/**
 * Manages connection to the swarm.
 */
export class NetworkManager {
  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(key => key.toHex());
  private readonly _maps = new ComplexMap<PublicKey, SwarmMapper>(key => key.toHex());

  private readonly _ice?: any[];
  private readonly _signalManager: SignalManager;
  private readonly _messenger: Messenger;
  private readonly _messageRouter: MessageRouter;
  private readonly _signalConnection: SignalConnection;
  private readonly _connectionLog?: ConnectionLog;

  public readonly topicsUpdated = new Event<void>();

  constructor ({
    signalManager,
    ice,
    log
  }: NetworkManagerOptions) {
    this._ice = ice ?? [];

    // Listen for signal manager events.
    {
      this._signalManager = signalManager;

      this._signalManager.swarmEvent.on(({ topic, swarmEvent: event }) =>
        this._swarms.get(topic)?.onSwarmEvent(event)
      );

      this._signalManager.onMessage.on((message) =>
        this._messageRouter.receiveMessage(message)
      );
    }

    {
      this._messenger = new Messenger({ signalManager: this._signalManager });

      const onOffer = async (message: OfferMessage) =>
        (await this._swarms.get(message.topic!)?.onOffer(message)) ?? { accept: false };

      this._messageRouter = new MessageRouter({
        sendMessage: (message) => this._messenger.sendMessage(message),
        onSignal: async (msg) => this._swarms.get(msg.topic!)?.onSignal(msg),
        onOffer: (msg) => onOffer(msg)
      });

      this._messenger.listen({
        payloadType: 'dxos.mesh.swarm.SwarmMessage',
        onMessage: (message) => this._messageRouter.receiveMessage(message)
      });
    }

    {
      this._signalConnection = {
        join: (opts) => this._signalManager.join(opts),
        leave: (opts) => this._signalManager.leave(opts)
      };
    }

    if (log) {
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
      throw new Error(`Already connected to swarm ${topic}`);
    }

    // TODO(burdon): Require factory (i.e., don't make InMemorySignalManager by default).
    // TODO(burdon): Bundle common transport related classes.
    const transportFactory =
      this._signalManager instanceof MemorySignalManager
        ? inMemoryTransportFactory
        : createWebRTCTransportFactory({ iceServers: this._ice });

    const swarm = new Swarm(
      topic,
      peerId,
      topology,
      protocol,
      this._messageRouter,
      transportFactory,
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
