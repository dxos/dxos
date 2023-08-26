//
// Copyright 2022 DXOS.org
//

import { scheduleTask, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { CancelledError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { OfferMessage, SignalMessage, SignalMessenger } from '../signal';
import { TransportFactory } from '../transport';
import { WireProtocolProvider } from '../wire-protocol';
import { Connection, ConnectionState } from './connection';
import { ConnectionLimiter } from './connection-limiter';

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

  /**
   * Peer is available to connect.
   */
  onPeerAvailable: () => void;
}

/**
 * Minimum time the connection needs to be open to not incur a cool-down timer for this peer after the connection closes.
 */
const CONNECTION_COUNTS_STABLE_AFTER = 5_000;

/**
 * State of remote peer during the lifetime of a swarm connection.
 * Can open and close multiple connections to the remote peer.
 */
export class Peer {
  /**
   * Will be available to connect after this time.
   */
  private _availableAfter = 0;
  public availableToConnect = true;
  private _lastConnectionTime?: number;

  private readonly _ctx = new Context();
  private _connectionCtx?: Context;

  public connection?: Connection;

  /**
   * Whether the peer is currently advertizing itself on the signal-network.
   */
  public advertizing = false;

  public initiating = false;

  // TODO(burdon): Convert to map?
  constructor(
    public readonly id: PublicKey,
    public readonly topic: PublicKey,
    public readonly localPeerId: PublicKey,
    private readonly _signalMessaging: SignalMessenger,
    private readonly _protocolProvider: WireProtocolProvider,
    private readonly _transportFactory: TransportFactory,
    private readonly _connectionLimiter: ConnectionLimiter,
    private readonly _callbacks: PeerCallbacks,
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
        log('close local connection', {
          localPeerId: this.id,
          topic: this.topic,
          remotePeerId: this.localPeerId,
          sessionId: this.connection?.sessionId,
        });

        if (this.connection) {
          // Close our connection and accept remote peer's connection.
          await this.closeConnection(new Error('Connection displaced by remote initiator.'));
        }
      } else {
        // Continue with our origination attempt, the remote peer will close it's connection and accept ours.
        return { accept: false };
      }
    }

    if (await this._callbacks.onOffer(remoteId)) {
      if (!this.connection) {
        // Connection might have been already established.
        invariant(message.sessionId);
        const connection = this._createConnection(false, message.sessionId);

        try {
          await this._connectionLimiter.connecting(message.sessionId);
          await connection.openConnection();
        } catch (err: any) {
          if (!(err instanceof CancelledError)) {
            log.warn('connection error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, err });
          }

          // Calls `onStateChange` with CLOSED state.
          await this.closeConnection(err);
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
    invariant(!this.initiating, 'Initiation in progress.');
    invariant(!this.connection, 'Already connected.');
    const sessionId = PublicKey.random();
    log('initiating...', { id: this.id, topic: this.topic, peerId: this.id, sessionId });

    const connection = this._createConnection(true, sessionId);
    this.initiating = true;

    try {
      await this._connectionLimiter.connecting(sessionId);

      const answer = await this._signalMessaging.offer({
        author: this.localPeerId,
        recipient: this.id,
        sessionId,
        topic: this.topic,
        data: { offer: {} },
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
      await connection.openConnection();
      this._callbacks.onAccepted();
    } catch (err: any) {
      log('initiation error', { err, topic: this.topic, peerId: this.localPeerId, remoteId: this.id });
      // Calls `onStateChange` with CLOSED state.
      await this.closeConnection(err);
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
      sessionId,
    });
    invariant(!this.connection, 'Already connected.');

    const connection = new Connection(
      this.topic,
      this.localPeerId,
      this.id,
      sessionId,
      initiator,
      this._signalMessaging,
      // TODO(dmaretskyi): Init only when connection is established.
      this._protocolProvider({ initiator, localPeerId: this.localPeerId, remotePeerId: this.id, topic: this.topic }),
      this._transportFactory,
    );
    this._callbacks.onInitiated(connection);

    void this._connectionCtx?.dispose();
    this._connectionCtx = this._ctx.derive();

    connection.stateChanged.on((state) => {
      switch (state) {
        case ConnectionState.CONNECTED: {
          this.availableToConnect = true;
          this._lastConnectionTime = Date.now();
          this._callbacks.onConnected();

          this._connectionLimiter.doneConnecting(sessionId);
          log.trace('dxos.mesh.connection.connected', {
            topic: this.topic,
            localPeerId: this.localPeerId,
            remotePeerId: this.id,
            sessionId,
            initiator,
          });
          break;
        }

        case ConnectionState.CLOSED: {
          log('connection closed', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, initiator });
          invariant(this.connection === connection, 'Connection mismatch (race condition).');

          log.trace('dxos.mesh.connection.closed', {
            topic: this.topic,
            localPeerId: this.localPeerId,
            remotePeerId: this.id,
            sessionId,
            initiator,
          });

          if (this._lastConnectionTime && this._lastConnectionTime + CONNECTION_COUNTS_STABLE_AFTER < Date.now()) {
            // If we're closing the connection, and it has been connected for a while, reset the backoff.
            this._availableAfter = 0;
          } else {
            this.availableToConnect = false;
            this._availableAfter = increaseInterval(this._availableAfter);
          }

          this.connection = undefined;
          this._callbacks.onDisconnected();
          this._connectionLimiter.doneConnecting(sessionId);

          scheduleTask(
            this._connectionCtx!,
            () => {
              this.availableToConnect = true;
              this._callbacks.onPeerAvailable();
            },
            this._availableAfter,
          );

          break;
        }
      }
    });
    connection.errors.handle((err) => {
      log.warn('connection error', { topic: this.topic, peerId: this.localPeerId, remoteId: this.id, initiator, err });
      log.trace('dxos.mesh.connection.error', {
        topic: this.topic,
        localPeerId: this.localPeerId,
        remotePeerId: this.id,
        sessionId,
        initiator,
        err,
      });

      // Calls `onStateChange` with CLOSED state.
      void this.closeConnection(err);
    });

    this.connection = connection;

    return connection;
  }

  async closeConnection(err?: Error) {
    if (!this.connection) {
      return;
    }
    const connection = this.connection;
    log('closing...', { peerId: this.id, sessionId: connection.sessionId });

    // Triggers `onStateChange` callback which will clean up the connection.
    // Won't throw.
    await connection.close(err);

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
    await this._ctx.dispose();
    log('Destroying peer', { peerId: this.id, topic: this.topic });

    // Won't throw.
    await this?.connection?.close();
  }
}

const increaseInterval = (interval: number) => {
  if (interval === 0) {
    return 50;
  } else if (interval < 500) {
    return 500;
  } else if (interval < 1000) {
    return 1000;
  } else if (interval < 5_000) {
    return 5_000;
  }
  return 10_000;
};
