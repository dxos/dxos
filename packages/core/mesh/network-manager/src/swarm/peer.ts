//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { OfferMessage, SignalMessage, SignalMessenger } from '../signal';
import { TransportFactory } from '../transport';
import { WireProtocolProvider } from '../wire-protocol';
import { Connection, ConnectionState } from './connection';

interface PeerCallbacks {
  /**
   * Connection attempt initiated.
   */
  onInitiated: (connection: Connection) => void;

  /**
   * Connection opened.
   */
  onConnected: () => void;

  /**
   * Connection closed.
   */
  onDisconnected: () => void;

  /**
   * Peer accepted our offer to connect.
   */
  onAccepted: () => void;

  /**
   * Peer rejected our offer to connect.
   */
  onRejected: () => void;

  /**
   * Returns true if the remote peer's offer should be accepted.
   */
  onOffer: (remoteId: PublicKey) => Promise<boolean>;
}

/**
 * State of remote peer during the lifetime of a swarm connection.
 * Can open and close multiple connections to the remote peer.
 */
export class Peer {
  public connection?: Connection;

  /**
   * Whether the peer is currently advertizing itself on the signal-network.
   */
  public advertizing = false;

  public initiating = false;

  constructor(
    public readonly id: PublicKey,
    public readonly topic: PublicKey,
    public readonly localPeerId: PublicKey,
    private readonly _signalMessaging: SignalMessenger,
    private readonly _protocolProvider: WireProtocolProvider,
    private readonly _transportFactory: TransportFactory,
    private readonly _callbacks: PeerCallbacks
  ) {}

  /**
   * Respond to remote offer.
   */
  async onOffer(message: OfferMessage): Promise<Answer> {
    const remoteId = message.author;

    // Check if we are already trying to connect to that peer.
    if (this.connection || this.initiating) {
      // Peer with the highest Id closes its connection, and accepts remote peer's offer.
      if (remoteId.toHex() < this.localPeerId.toHex()) {
        // TODO(burdon): Too verbose.
        log("closing local connection and accepting remote peer's offer", {
          id: this.id,
          topic: this.topic,
          peerId: this.localPeerId
        });

        if (this.connection) {
          // Close our connection and accept remote peer's connection.
          await this.closeConnection();
        }
      } else {
        // Continue with our origination attempt, the remote peer will close it's connection and accept ours.
        return { accept: false };
      }
    }

    if (await this._callbacks.onOffer(remoteId)) {
      if (!this.connection) {
        // Connection might have been already established.
        assert(message.sessionId);
        const connection = this._createConnection(false, message.sessionId);
        try {
          connection.openConnection();
        } catch (err: any) {
          log.warn('connection error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, err });
          // Calls `onStateChange` with CLOSED state.
          await this.closeConnection();
        }

        return { accept: true };
      }
    }
    return { accept: false };
  }

  /**
   * Initiate a connection to the remote peer.
   */
  async initiateConnection() {
    assert(!this.initiating, 'Initiation in progress.');
    assert(!this.connection, 'Already connected.');
    const sessionId = PublicKey.random();
    log('initiating...', { id: this.id, topic: this.topic, peerId: this.id, sessionId });
    const connection = this._createConnection(true, sessionId);
    this.initiating = true;

    try {
      const answer = await this._signalMessaging.offer({
        author: this.localPeerId,
        recipient: this.id,
        sessionId,
        topic: this.topic,
        data: { offer: {} }
      });
      log('received', { answer, topic: this.topic, ownId: this.localPeerId, remoteId: this.id });
      if (connection.state !== ConnectionState.INITIAL) {
        log('ignoring response');
        return;
      }

      if (!answer.accept) {
        this._callbacks.onRejected();
        return;
      }
      connection.openConnection();
      this._callbacks.onAccepted();
    } catch (err: any) {
      log.warn('initiation error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, err });
      // Calls `onStateChange` with CLOSED state.
      await this.closeConnection();
      throw err;
    } finally {
      this.initiating = false;
    }
  }

  /**
   * Create new connection.
   * Either we're initiating a connection or creating one in response to an offer from the other peer.
   */
  private _createConnection(initiator: boolean, sessionId: PublicKey) {
    log('creating connection', {
      topic: this.topic,
      peerId: this.localPeerId,
      remoteId: this.id,
      initiator,
      sessionId
    });
    assert(!this.connection, 'Already connected.');

    const connection = new Connection(
      this.topic,
      this.localPeerId,
      this.id,
      sessionId,
      initiator,
      this._signalMessaging,
      // TODO(dmaretskyi): Init only when connection is established.
      this._protocolProvider({ initiator, localPeerId: this.localPeerId, remotePeerId: this.id, topic: this.topic }),
      this._transportFactory
    );
    this._callbacks.onInitiated(connection);
    connection.stateChanged.on((state) => {
      switch (state) {
        case ConnectionState.CONNECTED: {
          this._callbacks.onConnected();
          break;
        }

        case ConnectionState.CLOSED: {
          log('connection closed', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, initiator });
          assert(this.connection === connection, 'Connection mismatch (race condition).');

          this.connection = undefined;
          this._callbacks.onDisconnected();
          break;
        }
      }
    });
    connection.errors.handle((err) => {
      log.warn('connection error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, initiator, err });

      // Calls `onStateChange` with CLOSED state.
      void this.closeConnection();
    });

    this.connection = connection;

    return connection;
  }

  async closeConnection() {
    if (!this.connection) {
      return;
    }
    const connection = this.connection;
    log('closing...', { peerId: this.id, sessionId: connection.sessionId });

    // Triggers `onStateChange` callback which will clean up the connection.
    // Won't throw.
    await connection.close();

    log('closed', { peerId: this.id, sessionId: connection.sessionId });
  }

  async onSignal(message: SignalMessage) {
    if (!this.connection) {
      log('dropping signal message for non-existent connection', { message });
      return;
    }
    await this.connection.signal(message);
  }

  @synchronized
  async destroy() {
    log('Destroying peer', { peerId: this.id, topic: this.topic });

    // Won't throw.
    await this?.connection?.close();
  }
}
