//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { OfferMessage, SignalMessage, SignalMessenger } from '../signal';
import { TransportFactory } from '../transport';
import { WireProtocol, WireProtocolProvider } from '../wire-protocol';
import { Connection, ConnectionState } from './connection';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';

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

  constructor(
    public readonly id: PublicKey,
    public readonly topic: PublicKey,
    public readonly localPeerId: PublicKey,
    private readonly _signalMessaging: SignalMessenger,
    private readonly _protocolProvider: WireProtocolProvider,
    private readonly _transportFactory: TransportFactory,
    private readonly _callbacks: PeerCallbacks
  ) {}

  async onOffer(message: OfferMessage): Promise<Answer> {
    const remoteId = message.author;

    let accept = false;
    if (await this._callbacks.onOffer(remoteId)) {
      if (!this.connection) {
        // Connection might have been already established.
        assert(message.sessionId);
        const connection = this.createConnection(false, message.sessionId);
        try {
          connection.openConnection();
        } catch (err: any) {
          log.warn('connection error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, err });
          // Calls `onStateChange` with CLOSED state.
          void this.closeConnection().catch(() => {
            log.catch(err);
          });
        }

        accept = true;
      }
    }
    return { accept };
  }

  /**
   * Create new connection.
   * Either we're initiating a connection or creating one in response to an offer from the other peer.
   */
  createConnection(initiator: boolean, sessionId: PublicKey) {
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

        case ConnectionState.REJECTED: {
          this._callbacks.onRejected();
          break;
        }

        case ConnectionState.ACCEPTED: {
          this._callbacks.onAccepted();
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
      void this.closeConnection().catch(() => {
        log.catch(err);
      });
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

    try {
      // Triggers `onStateChange` callback which will clean up the connection.
      await connection.close();
    } catch (err) {
      log.catch(err);
    }

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
