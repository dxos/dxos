//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, sleep } from '@dxos/async';
import { discoveryKey } from '@dxos/crypto';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger } from '@dxos/messaging';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, ComplexSet, isNotNullOrUndefined } from '@dxos/util';

import { ProtocolProvider } from '../network-manager';
import { MessageRouter } from '../signal';
import { OfferMessage, SignalMessage } from '../signal/signal-messaging';
import { SwarmController, Topology } from '../topology';
import { TransportFactory } from '../transport';
import { Topic } from '../types';
import { Connection, ConnectionState } from './connection';
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

  /**
   * Unique id of the swarm, local to the current peer, generated when swarm is joined.
   */
  readonly id = PublicKey.random();

  /**
   * New connection to a peer is started.
   */
  readonly connectionAdded = new Event<Connection>();

  /**
   * Connection to a peer is dropped.
   */
  readonly connectionRemoved = new Event<Connection>();

  /**
   * Connection is established to a new peer.
   */
  readonly connected = new Event<PublicKey>();

  readonly errors = new ErrorStream();

  // TODO(burdon): Swarm => Peer.create/destroy =< Connection.open/close

  // TODO(burdon): Split up properties.
  constructor(
    private readonly _topic: PublicKey,
    private readonly _ownPeerId: PublicKey,
    private _topology: Topology,
    private readonly _protocolProvider: ProtocolProvider,
    private readonly _messenger: Messenger,
    private readonly _transportFactory: TransportFactory,
    private readonly _label: string | undefined
  ) {
    log('creating swarm', { topic: this._topic, peerId: _ownPeerId });
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
      .map(peer => peer.connection)
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
    log('destroying', { topic: this._topic });
    await this._topology.destroy();
    await Promise.all(Array.from(this._peers.keys()).map((key) => this._closeConnection(key)));
  }

  async setTopology(topology: Topology) {
    if (topology === this._topology) {
      return;
    }
    log('setting topology', {
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
      peer = new Peer(peerId);
      this._peers.set(peerId, peer);
    }
    return peer;
  }

  onSwarmEvent(swarmEvent: SwarmEvent) {
    log('swarm event', { topic: this._topic, swarmEvent }); // TODO(burdon): Stringify.

    if (swarmEvent.peerAvailable) {
      const peerId = PublicKey.from(swarmEvent.peerAvailable.peer);
      log('new peer', { topic: this._topic, peerId });
      if (!peerId.equals(this._ownPeerId)) {
        const peer = this._getOrCreatePeer(peerId);
        peer.advertizing = true;
      }
    } else if (swarmEvent.peerLeft) {
      const peer = this._peers.get(PublicKey.from(swarmEvent.peerLeft.peer));
      if (peer) {
        peer.advertizing = false;

        if (!peer.connection) {
          this._peers.delete(peer.id);
        }
      }
    }

    this._topology.update();
  }

  async onOffer(message: OfferMessage): Promise<Answer> {
    log('offer', { topic: this._topic, message });

    // Id of the peer offering us the connection.
    assert(message.author);
    const remoteId = message.author;
    if (!message.recipient?.equals(this._ownPeerId)) {
      log('rejecting offer with incorrect peerId', { topic: this._topic, message });
      return { accept: false };
    }
    if (!message.topic?.equals(this._topic)) {
      log('rejecting offer with incorrect topic', { topic: this._topic, message });
      return { accept: false };
    }

    // Check if we are already trying to connect to that peer.
    if (this._peers.get(remoteId)?.connection) {
      // Peer with the highest Id closes its connection, and accepts remote peer's offer.
      if (remoteId.toHex() < this._ownPeerId.toHex()) {
        log("closing local connection and accepting remote peer's offer", {
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

    let accept = false;
    if (await this._topology.onOffer(remoteId)) {
      if (!this._peers.get(remoteId)?.connection) {
        // Connection might have been already established.
        assert(message.sessionId);
        const connection = this._createConnection(false, message.author, message.sessionId);
        try {
          connection.openConnection();
        } catch (err: any) {
          this.errors.raise(err);
        }

        accept = true;
      }
    }

    this._topology.update();
    return { accept };
  }

  async onSignal(message: SignalMessage): Promise<void> {
    log('signal', { topic: this._topic, message });
    assert(
      message.recipient?.equals(this._ownPeerId),
      `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.recipient}`
    );
    assert(message.topic?.equals(this._topic));
    assert(message.author);
    const connection = this._peers.get(message.author)?.connection;
    if (!connection) {
      log('dropping signal message for non-existent connection', { topic: this._topic, message });
      return;
    }

    await connection.signal(message);
  }

  private _getSwarmController(): SwarmController {
    return {
      getState: () => ({
        ownPeerId: this._ownPeerId,
        connected: Array.from(this._peers.values())
          .filter(peer => peer.connection)
          .map(peer => peer.id),
        candidates: Array.from(this._peers.values())
          .filter(peer => !peer.connection && peer.advertizing)
          .map(peer => peer.id)
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

    log('initiating...', { topic: this._topic, peerId: remoteId, sessionId });
    const connection = this._createConnection(true, remoteId, sessionId);
    connection.initiate();
    this._topology.update();
    log('initiated', { topic: this._topic });
  }

  /**
   * Synchronously create a connection, which must be initialized.
   */
  private _createConnection(initiator: boolean, remoteId: PublicKey, sessionId: PublicKey): Connection {
    const peer = this._getOrCreatePeer(remoteId);

    const connection = peer.createConnection(
      this._topic,
      this._ownPeerId,
      this._swarmMessenger,
      initiator,
      sessionId,
      this._protocolProvider({ channel: discoveryKey(this._topic), initiator }),
      this._transportFactory,
      state => {
        switch (state) {
          case ConnectionState.CONNECTED: {
            this.connected.emit(remoteId);
            break;
          }

          case ConnectionState.REJECTED: {
            // If the peer rejected our connection remove it from the set of candidates.
            this._peers.delete(remoteId); // TODO(dmaretskyi): Set flag instead.
            break;
          }

          case ConnectionState.ACCEPTED: {
            this._topology.update();
            break;
          }

          case ConnectionState.CLOSED: {
            log('connection closed', { topic: this._topic, peerId: this._ownPeerId, remoteId, initiator });
            // Connection might have been already closed or replace by a different one.
            // Only remove the connection if it has the same session id.
            // TODO(dmaretskyi): Seems like a race-condition lets simplify this code.
            if (this._peers.get(remoteId)?.connection?.sessionId.equals(sessionId)) {
              this._peers.get(remoteId)!.connection = undefined;
              this.connectionRemoved.emit(connection);
              this._topology.update();
            }
            break;
          }
        }
      },
      err => {
        // TODO(burdon): Change to warn? Why does this fail during tests?
        log('connection failed', { topic: this._topic, peerId: this._ownPeerId, remoteId, initiator, err });
        this._closeConnection(remoteId).catch((err) => this.errors.raise(err));
      }
    )

    this.connectionAdded.emit(connection);
    return connection;
  }

  private async _closeConnection(peerId: PublicKey) {
    const peer = this._peers.get(peerId);
    if (!peer) {
      return;
    }
    
    await peer.closeConnection();

    // TODO(dmaretskyi): Replace with callback.
    if (!peer.advertizing) {
      this._peers.delete(peerId);
    }
  }
}
