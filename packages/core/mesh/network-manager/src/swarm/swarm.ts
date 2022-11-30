//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, sleep } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger } from '@dxos/messaging';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

import { MessageRouter, OfferMessage, SignalMessage } from '../signal';
import { SwarmController, Topology } from '../topology';
import { TransportFactory } from '../transport';
import { Topic } from '../types';
import { WireProtocolProvider } from '../wire-protocol';
import { Connection } from './connection';
import { Peer } from './peer';

const INITIATION_DELAY = 100;

// TODO(burdon): Factor out.
const getClassName = (obj: any) => Object.getPrototypeOf(obj).constructor.name;

/**
 * A single peer's view of the swarm.
 * Manages a set of connections implemented by simple-peer instances.
 * Routes signal events and maintains swarm topology.
 */
export class Swarm {
  private readonly _peers = new ComplexMap<PublicKey, Peer>(PublicKey.hash);

  private readonly _swarmMessenger: MessageRouter;

  private _destroyed = false;

  /**
   * Unique id of the swarm, local to the current peer, generated when swarm is joined.
   */
  readonly id = PublicKey.random();

  /**
   * New connection to a peer is started.
   * @internal
   */
  readonly connectionAdded = new Event<Connection>();

  /**
   * Connection to a peer is dropped.
   * @internal
   */
  readonly disconnected = new Event<PublicKey>();

  /**
   * Connection is established to a new peer.
   * @internal
   */
  readonly connected = new Event<PublicKey>();

  readonly errors = new ErrorStream();

  // TODO(burdon): Swarm => Peer.create/destroy =< Connection.open/close

  // TODO(burdon): Split up properties.
  constructor(
    private readonly _topic: PublicKey,
    private readonly _ownPeerId: PublicKey,
    private _topology: Topology,
    private readonly _protocolProvider: WireProtocolProvider,
    private readonly _messenger: Messenger,
    private readonly _transportFactory: TransportFactory,
    private readonly _label: string | undefined
  ) {
    log('creating swarm', { id: this.id, topic: this._topic, peerId: _ownPeerId });
    _topology.init(this._getSwarmController());

    this._swarmMessenger = new MessageRouter({
      sendMessage: async (msg) => await this._messenger.sendMessage(msg),
      onSignal: async (msg) => await this.onSignal(msg),
      onOffer: async (msg) => await this.onOffer(msg),
      topic: this._topic
    });

    this._messenger
      .listen({
        peerId: this._ownPeerId,
        payloadType: 'dxos.mesh.swarm.SwarmMessage',
        onMessage: async (message) => await this._swarmMessenger.receiveMessage(message)
      })
      .catch((error) => log.catch(error));
  }

  get connections() {
    return Array.from(this._peers.values())
      .map((peer) => peer.connection)
      .filter(isNotNullOrUndefined);
  }

  get ownPeerId() {
    return this._ownPeerId;
  }

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  get label(): string | undefined {
    return this._label;
  }

  get topic(): Topic {
    return this._topic;
  }

  // TODO(burdon): async open?
  async destroy() {
    log('destroying', { id: this.id, topic: this._topic });
    this._destroyed = true;
    await this._topology.destroy();
    await Promise.all(Array.from(this._peers.keys()).map((key) => this._closeConnection(key)));
  }

  async setTopology(topology: Topology) {
    if (topology === this._topology) {
      return;
    }
    log('setting topology', {
      id: this.id,
      topic: this._topic,
      previous: getClassName(this._topology),
      topology: getClassName(topology)
    });

    await this._topology.destroy();
    this._topology = topology;
    this._topology.init(this._getSwarmController());
    this._topology.update();
  }

  private _getOrCreatePeer(peerId: PublicKey): Peer {
    let peer = this._peers.get(peerId);
    if (!peer) {
      peer = new Peer(
        peerId,
        this._topic,
        this._ownPeerId,
        this._swarmMessenger,
        this._protocolProvider,
        this._transportFactory,
        {
          onInitiated: (connection) => {
            this.connectionAdded.emit(connection);
          },
          onConnected: () => {
            this.connected.emit(peerId);
          },
          onDisconnected: async () => {
            if (!peer!.advertizing) {
              await this._destroyPeer(peer!.id);
            }

            this.disconnected.emit(peerId);
            this._topology.update();
          },
          onRejected: () => {
            // If the peer rejected our connection remove it from the set of candidates.
            // TODO(dmaretskyi): Set flag instead.
            if (this._peers.has(peerId)) {
              void this._destroyPeer(peerId);
            }
          },
          onAccepted: () => {
            this._topology.update();
          },
          onOffer: (remoteId) => {
            return this._topology.onOffer(remoteId);
          }
        }
      );
      this._peers.set(peerId, peer);
    }

    return peer;
  }

  private async _destroyPeer(peerId: PublicKey) {
    assert(this._peers.has(peerId));
    await this._peers.get(peerId)!.destroy();
    this._peers.delete(peerId);
  }

  onSwarmEvent(swarmEvent: SwarmEvent) {
    log('swarm event', { id: this.id, topic: this._topic, swarmEvent }); // TODO(burdon): Stringify.
    if (this._destroyed) {
      log.warn('ignored for destroyed swarm', { peerId: this.id, topic: this._topic });
      return;
    }

    if (swarmEvent.peerAvailable) {
      const peerId = PublicKey.from(swarmEvent.peerAvailable.peer);
      log('new peer', { id: this.id, topic: this._topic, peerId });
      if (!peerId.equals(this._ownPeerId)) {
        const peer = this._getOrCreatePeer(peerId);
        peer.advertizing = true;
      }
    } else if (swarmEvent.peerLeft) {
      const peer = this._peers.get(PublicKey.from(swarmEvent.peerLeft.peer));
      if (peer) {
        peer.advertizing = false;
        if (!peer.connection) {
          void this._destroyPeer(peer.id);
        }
      }
    }

    this._topology.update();
  }

  async onOffer(message: OfferMessage): Promise<Answer> {
    log('offer', { id: this.id, topic: this._topic, message });
    if (this._destroyed) {
      log.info('ignored for destroyed swarm', { peerId: this.id, topic: this._topic });
      return { accept: false };
    }

    // Id of the peer offering us the connection.
    assert(message.author);
    const remoteId = message.author;
    if (!message.recipient?.equals(this._ownPeerId)) {
      log('rejecting offer with incorrect peerId', { id: this.id, topic: this._topic, message });
      return { accept: false };
    }
    if (!message.topic?.equals(this._topic)) {
      log('rejecting offer with incorrect topic', { id: this.id, topic: this._topic, message });
      return { accept: false };
    }

    const peer = this._getOrCreatePeer(remoteId);

    // Check if we are already trying to connect to that peer.
    if (peer.connection) {
      // Peer with the highest Id closes its connection, and accepts remote peer's offer.
      if (remoteId.toHex() < this._ownPeerId.toHex()) {
        log.info("closing local connection and accepting remote peer's offer", {
          id: this.id,
          topic: this._topic,
          peerId: this._ownPeerId
        });
        // Close our connection and accept remote peer's connection.
        await this._closeConnection(remoteId).catch((err) => {
          this.errors.raise(err);
        });
      } else {
        // Continue with our origination attempt, the remote peer will close it's connection and accept ours.
        return { accept: true };
      }
    }

    const answer = await peer.onOffer(message);
    this._topology.update();
    return answer;
  }

  async onSignal(message: SignalMessage): Promise<void> {
    log('signal', { id: this.id, topic: this._topic, message });
    if (this._destroyed) {
      log.info('ignored for destroyed swarm', { peerId: this.id, topic: this._topic });
      return;
    }
    assert(
      message.recipient?.equals(this._ownPeerId),
      `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.recipient}`
    );
    assert(message.topic?.equals(this._topic));
    assert(message.author);

    const peer = this._getOrCreatePeer(message.author);
    await peer.onSignal(message);
  }

  private _getSwarmController(): SwarmController {
    return {
      getState: () => ({
        ownPeerId: this._ownPeerId,
        connected: Array.from(this._peers.values())
          .filter((peer) => peer.connection)
          .map((peer) => peer.id),
        candidates: Array.from(this._peers.values())
          .filter((peer) => !peer.connection && peer.advertizing)
          .map((peer) => peer.id)
      }),
      connect: (peer) => this._initiateConnection(peer),
      disconnect: async (peer) => {
        try {
          await this._closeConnection(peer);
        } catch (err: any) {
          this.errors.raise(err);
        }
        this._topology.update();
      }
    };
  }

  /**
   * Creates a connection then sends message over signal network.
   */
  private async _initiateConnection(remoteId: PublicKey) {
    // It is likely that the other peer will also try to connect to us at the same time.
    // If our peerId is higher, we will wait for a bit so that other peer has a chance to connect first.
    if (remoteId.toHex() < this._ownPeerId.toHex()) {
      await sleep(INITIATION_DELAY);
    }

    if (this._peers.get(remoteId)?.connection) {
      // Do nothing if peer is already connected.
      return;
    }

    const sessionId = PublicKey.random();

    log('initiating...', { id: this.id, topic: this._topic, peerId: remoteId, sessionId });
    const peer = this._getOrCreatePeer(remoteId);
    const connection = peer.createConnection(true, sessionId);
    connection.initiate();
    this._topology.update();
    log('initiated', { id: this.id, topic: this._topic });
  }

  private async _closeConnection(peerId: PublicKey) {
    const peer = this._peers.get(peerId);
    if (!peer) {
      return;
    }

    await peer.closeConnection();
  }
}
