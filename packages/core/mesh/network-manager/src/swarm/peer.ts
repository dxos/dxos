import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import { Protocol } from "@dxos/mesh-protocol";
import { Callback } from "@dxos/util";
import assert from "assert";
import { SignalMessage, SignalMessaging } from "../signal";
import { TransportFactory } from "../transport";
import { Connection, ConnectionState } from "./connection";

interface PeerCallbacks {
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
}

export class Peer {
  public connection?: Connection;

  /**
   * Whether the peer is currently advertizing itself on the signal-network. 
   */
  public advertizing = false;

  constructor(
    public readonly id: PublicKey,
    private readonly _callbacks: PeerCallbacks,
  ) { }

  /**
   * Create new connection.
   * Either we're initiating a connection or creating one in response to an offer from the other peer.
   */
  createConnection(
    // TODO(dmaretskyi): Make some of those fields.
    topic: PublicKey,
    localPeerId: PublicKey,
    signalMessaging: SignalMessaging,
    initiator: boolean,
    sessionId: PublicKey,
    protocol: Protocol,
    transportFactory: TransportFactory,
  ) {
    log('creating connection', { topic, peerId: localPeerId, remoteId: this.id, initiator, sessionId });
    assert(!this.connection, 'Already connected.');
    const connection = new Connection(
      topic,
      localPeerId,
      this.id,
      sessionId,
      initiator,
      signalMessaging,
      protocol,
      transportFactory,
    );
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
          log('connection closed', { topic, peerId: localPeerId, remoteId: this.id, initiator });
          assert(this.connection === connection, 'Connection mismatch (race condition).');

          this.connection = undefined;
          this._callbacks.onDisconnected();
          break;
        }
      }
    });
    connection.errors.handle((err) => {
      log.warn('connection error', { topic, peerId: localPeerId, remoteId: this.id, initiator });

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
}