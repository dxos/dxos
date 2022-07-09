//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import { discoveryKey, PublicKey } from '@dxos/crypto';
import { ErrorStream } from '@dxos/debug';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { ProtocolProvider } from '../network-manager';
import { SignalApi, SignalConnection } from '../signal';
import { SwarmController, Topology } from '../topology';
import { TransportFactory } from '../transport';
import { Topic } from '../types';
import { Connection, ConnectionState } from './connection';

const log = debug('dxos:network-manager:swarm');

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

  private readonly _connections = new ComplexMap<PublicKey, Connection>(x => x.toHex());
  private readonly _discoveredPeers = new ComplexSet<PublicKey>(x => x.toHex());
  private readonly _peerCandidatesUpdated = new Event();

  get connections () {
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

  // TODO(burdon): Split up properties.
  constructor (
    private readonly _topic: PublicKey,
    private readonly _ownPeerId: PublicKey,
    private _topology: Topology,
    private readonly _protocolProvider: ProtocolProvider,
    private readonly _signalConnection: SignalConnection,
    private readonly _transportFactory: TransportFactory,
    private readonly _label: string | undefined
  ) {
    log(`Creating swarm topic=${_topic} peerId=${_ownPeerId}`);
    _topology.init(this._getSwarmController());
  }

  get ownPeerId () {
    return this._ownPeerId;
  }

  /**
   * Custom label assigned to this swarm. Used in devtools to display human-readable names for swarms.
   */
  get label (): string | undefined {
    return this._label;
  }

  get topic (): Topic {
    return this._topic;
  }

  onPeerCandidatesChanged (candidates: PublicKey[]) {
    log(`New peers for ${this._topic} ${candidates}`);
    this._discoveredPeers.clear();
    for (const candidate of candidates) {
      if (candidate.equals(this._ownPeerId)) {
        continue;
      }
      this._discoveredPeers.add(candidate);
    }
    this._peerCandidatesUpdated.emit();
    this._topology.update();
  }

  async onOffer (message: SignalApi.SignalMessage): Promise<SignalApi.Answer> {
    log(`Offer from ${message.id} topic=${this._topic}`);
    // Id of the peer offering us the connection.
    const remoteId = message.id;
    assert(message.remoteId.equals(this._ownPeerId));
    assert(message.topic.equals(this._topic));

    // Check if we are already trying to connect to that peer.
    if (this._connections.has(remoteId)) {
      // Peer with the highest Id closes it's connection, and accepts remote peer's offer.
      if (remoteId.toHex() < this._ownPeerId.toHex()) {
        log(`[${this._ownPeerId}] Closing local connection and accepting remote peer's offer.`);
        // Close our connection and accept remote peer's connection.
        await this._closeConnection(remoteId).catch(err => {
          this.errors.raise(err);
        });
      } else {
        // Continue with our origination attempt, the remote peer will close it's connection and accept ours.
        return { accept: true };
      }
    }

    let accept = false;
    if (await this._topology.onOffer(remoteId)) {
      if (!this._connections.has(remoteId)) { // Connection might have been already established.
        const connection = this._createConnection(false, message.id, message.sessionId);
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

  async onSignal (message: SignalApi.SignalMessage): Promise<void> {
    log(`Signal ${this._topic} ${JSON.stringify(message)}`);
    assert(message.remoteId.equals(this._ownPeerId), `Invalid signal peer id expected=${this.ownPeerId}, actual=${message.remoteId}`);
    assert(message.topic.equals(this._topic));
    const connection = this._connections.get(message.id);
    if (!connection) {
      log(`Dropping signal message for non-existent connection: topic=${this._topic}, peerId=${message.id}`);
      return;
    }

    await connection.signal(message);
  }

  async setTopology (newTopology: Topology) {
    log(`Set topology for ${this._topic} ${Object.getPrototypeOf(this._topology).constructor.name} ${Object.getPrototypeOf(newTopology).constructor.name}`);
    if (newTopology === this._topology) {
      return;
    }
    await this._topology.destroy();
    this._topology = newTopology;
    this._topology.init(this._getSwarmController());
    this._topology.update();
  }

  async destroy () {
    log(`Destroy swarm ${this._topic}`);
    await this._topology.destroy();
    await Promise.all(Array.from(this._connections.keys()).map(key => this._closeConnection(key)));
  }

  private _getSwarmController (): SwarmController {
    return {
      getState: () => ({
        ownPeerId: this._ownPeerId,
        connected: Array.from(this._connections.keys()),
        candidates: Array.from(this._discoveredPeers.keys()).filter(key => !this._connections.has(key))
      }),
      connect: peer => this._initiateConnection(peer),
      disconnect: async peer => {
        try {
          await this._closeConnection(peer);
        } catch (err: any) {
          this.errors.raise(err);
        }
        this._topology.update();
      },
      lookup: () => {
        this._signalConnection.lookup(this._topic);
      }
    };
  }

  private _initiateConnection (remoteId: PublicKey) {
    if (this._connections.has(remoteId)) {
      // Do nothing if peer is already connected.
      return;
    }

    const sessionId = PublicKey.random();

    const connection = this._createConnection(true, remoteId, sessionId);
    this._signalConnection.offer({
      id: this._ownPeerId,
      remoteId,
      sessionId,
      topic: this._topic,
      data: {}
    })
      .then(answer => {
        log(`Received answer: ${JSON.stringify(answer)} topic=${this._topic} ownId=${this._ownPeerId} remoteId=${remoteId}`);
        if (connection.state !== ConnectionState.INITIAL) {
          log('Ignoring answer.');
          return;
        }

        if (answer.accept) {
          try {
            connection.connect();
          } catch (err: any) {
            this.errors.raise(err);
          }
        } else {
          // If the peer rejected our connection remove it from the set of candidates.
          this._discoveredPeers.delete(remoteId);
        }
        this._topology.update();
      })
      .catch(err => {
        this.errors.raise(err);
      });

    this._topology.update();
  }

  private _createConnection (initiator: boolean, remoteId: PublicKey, sessionId: PublicKey) {
    log(`Create connection topic=${this._topic} remoteId=${remoteId} initiator=${initiator}`);
    assert(!this._connections.has(remoteId), 'Peer already connected.');

    const connection = new Connection(
      this._topic,
      this._ownPeerId,
      remoteId,
      sessionId,
      initiator,
      (msg: SignalApi.SignalMessage) => this._signalConnection.signal(msg),
      this._protocolProvider({ channel: discoveryKey(this._topic), initiator }),
      this._transportFactory
    );

    this._connections.set(remoteId, connection);
    this.connectionAdded.emit(connection);

    connection.errors.handle(error => {
      log(`Connection error topic=${this._topic} remoteId=${remoteId} ${error.stack}`);
      this._closeConnection(remoteId).catch(err => this.errors.raise(err));
    });

    void connection.stateChanged.waitFor(s => s === ConnectionState.CONNECTED).then(() => this.connected.emit(remoteId));

    void connection.stateChanged.waitFor(s => s === ConnectionState.CLOSED).then(() => {
      log(`Connection closed topic=${this._topic} remoteId=${remoteId} initiator=${initiator}`);
      // Connection might have been already closed or replace by a different one.
      // Only remove the connection if it has the same session id.
      if (this._connections.get(remoteId)?.sessionId.equals(sessionId)) {
        this._connections.delete(remoteId);
        this.connectionRemoved.emit(connection);
      }
    });

    return connection;
  }

  private async _closeConnection (peerId: PublicKey) {
    log(`Close connection topic=${this._topic} remoteId=${peerId}`);
    const connection = this._connections.get(peerId);
    if (!connection) {
      return;
    }

    this._connections.delete(peerId);
    await connection.close();
  }
}
