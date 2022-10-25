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
import { ComplexMap, ComplexSet } from '@dxos/util';

import { ProtocolProvider } from '../network-manager';
import { MessageRouter } from '../signal';
import { OfferMessage, SignalMessage } from '../signal/signal-messaging';
import { SwarmController, Topology } from '../topology';
import { TransportFactory } from '../transport';
import { Topic } from '../types';
import { Connection, ConnectionState } from './connection';

const INITIATION_DELAY = 100;

/**
 * A single peer's view of the swarm.
 * Manages a set of connections implemented by simple-peer instances.
 * Routes signal events and maintains swarm topology.
 */
export class Swarm {
  /**
   * Unique id of the swarm, local to the current peer, generated when swarm is joined.
   */
  readonly id = PublicKey.random();

  private readonly _connections = new ComplexMap<PublicKey, Connection>(
    PublicKey.hash
  );

  private readonly _discoveredPeers = new ComplexSet<PublicKey>(PublicKey.hash);

  get connections() {
    return Array.from(this._connections.values());
  }

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

  private readonly _swarmMessenger: MessageRouter;

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
    log('creating swarm', { topic: _topic, peerId: _ownPeerId });
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
        onMessage: async (message) =>
          await this._swarmMessenger.receiveMessage(message)
      })
      .catch((error) => log.catch(error));
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

  onSwarmEvent(swarmEvent: SwarmEvent) {
    log('swarm event', { swarmEvent });
    if (swarmEvent.peerAvailable) {
      const peerId = PublicKey.from(swarmEvent.peerAvailable.peer);
      log('new peer', { topic: this._topic, peerId });
      if (!peerId.equals(this._ownPeerId)) {
        this._discoveredPeers.add(peerId);
      }
    } else if (swarmEvent.peerLeft) {
      this._discoveredPeers.delete(PublicKey.from(swarmEvent.peerLeft.peer));
    }

    this._topology.update();
  }

  async onOffer(message: OfferMessage): Promise<Answer> {
    log(`offer from ${message}`);
    // Id of the peer offering us the connection.
    assert(message.author);
    const remoteId = message.author;
    if (!message.recipient?.equals(this._ownPeerId)) {
      log(`rejecting offer with incorrect peerId: ${message.author}`);
      return { accept: false };
    }
    if (!message.topic?.equals(this._topic)) {
      log(`rejecting offer with incorrect topic: ${message.topic}`);
      return { accept: false };
    }

    // Check if we are already trying to connect to that peer.
    if (this._connections.has(remoteId)) {
      // Peer with the highest Id closes it's connection, and accepts remote peer's offer.
      if (remoteId.toHex() < this._ownPeerId.toHex()) {
        log(
          `[${this._ownPeerId}] Closing local connection and accepting remote peer's offer.`
        );
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
      if (!this._connections.has(remoteId)) {
        // Connection might have been already established.
        assert(message.sessionId);
        const connection = this._createConnection(
          false,
          message.author,
          message.sessionId
        );
        try {
          connection.connect();
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
    log(`Signal ${this._topic} ${message}`);
    assert(
      message.recipient?.equals(this._ownPeerId),
      `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.recipient}`
    );
    assert(message.topic?.equals(this._topic));
    assert(message.author);
    const connection = this._connections.get(message.author);
    if (!connection) {
      log(
        `Dropping signal message for non-existent connection: topic=${this._topic}, peerId=${message.author}`
      );
      return;
    }

    await connection.signal(message);
  }

  async setTopology(newTopology: Topology) {
    log(
      `Set topology for ${this._topic} ${
        Object.getPrototypeOf(this._topology).constructor.name
      } ${Object.getPrototypeOf(newTopology).constructor.name}`
    );
    if (newTopology === this._topology) {
      return;
    }
    await this._topology.destroy();
    this._topology = newTopology;
    this._topology.init(this._getSwarmController());
    this._topology.update();
  }

  async destroy() {
    log('destroying', { topic: this._topic });
    await this._topology.destroy();
    await Promise.all(
      Array.from(this._connections.keys()).map((key) =>
        this._closeConnection(key)
      )
    );
  }

  private _getSwarmController(): SwarmController {
    return {
      getState: () => ({
        ownPeerId: this._ownPeerId,
        connected: Array.from(this._connections.keys()),
        candidates: Array.from(this._discoveredPeers.keys()).filter(
          (key) => !this._connections.has(key)
        )
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

  private async _initiateConnection(remoteId: PublicKey) {
    // It is likely that the other peer will also try to connect to us at the same time.
    // If our peerId is higher, we will wait for a bit so that other peer has a chance to connect first.
    if (remoteId.toHex() < this._ownPeerId.toHex()) {
      await sleep(INITIATION_DELAY);
    }

    if (this._connections.has(remoteId)) {
      // Do nothing if peer is already connected.
      return;
    }

    const sessionId = PublicKey.random();

    log(
      `Initiate connection: topic=${this._topic} peerId=${remoteId} sessionId=${sessionId}`
    );
    const connection = this._createConnection(true, remoteId, sessionId);
    connection.initiate();

    this._topology.update();
  }

  private _createConnection(
    initiator: boolean,
    remoteId: PublicKey,
    sessionId: PublicKey
  ) {
    log(
      `Create connection topic=${this._topic} ownId=${this._ownPeerId} remoteId=${remoteId} initiator=${initiator}`
    );
    assert(!this._connections.has(remoteId), 'Peer already connected.');

    const connection = new Connection(
      this._topic,
      this._ownPeerId,
      remoteId,
      sessionId,
      initiator,
      this._swarmMessenger,
      this._protocolProvider({ channel: discoveryKey(this._topic), initiator }),
      this._transportFactory
    );

    this._connections.set(remoteId, connection);
    this.connectionAdded.emit(connection);

    connection.errors.handle((error) => {
      log(
        `Connection error topic=${this._topic} remoteId=${remoteId} ${error.stack}`
      );
      this._closeConnection(remoteId).catch((err) => this.errors.raise(err));
    });

    connection.stateChanged.on((state) => {
      switch (state) {
        case ConnectionState.CONNECTED:
          this.connected.emit(remoteId);
          break;

        case ConnectionState.REJECTED:
          // If the peer rejected our connection remove it from the set of candidates.
          this._discoveredPeers.delete(remoteId);
          break;

        case ConnectionState.ACCEPTED:
          this._topology.update();
          break;

        case ConnectionState.CLOSED:
          log(
            `Connection closed topic=${this._topic} remoteId=${remoteId} initiator=${initiator}`
          );
          // Connection might have been already closed or replace by a different one.
          // Only remove the connection if it has the same session id.
          if (this._connections.get(remoteId)?.sessionId.equals(sessionId)) {
            this._connections.delete(remoteId);
            this.connectionRemoved.emit(connection);
            this._topology.update();
          }
          break;
      }
    });

    return connection;
  }

  private async _closeConnection(peerId: PublicKey) {
    log(`Close connection topic=${this._topic} remoteId=${peerId}`);
    const connection = this._connections.get(peerId);
    if (!connection) {
      return;
    }

    this._connections.delete(peerId);
    await connection.close();
  }
}
