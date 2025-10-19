//
// Copyright 2024 DXOS.org
//

import {
  Event,
  PersistentLifecycle,
  Trigger,
  TriggerState,
  scheduleMicroTask,
  scheduleTaskInterval,
} from '@dxos/async';
import { type Lifecycle, Resource } from '@dxos/context';
import { log, logInfo } from '@dxos/log';
import { type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';

import { protocol } from './defs';
import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { EdgeWsConnection } from './edge-ws-connection';
import { EdgeConnectionClosedError, EdgeIdentityChangedError } from './errors';
import { type Protocol } from './protocol';
import { getEdgeUrlWithProtocol } from './utils';

const DEFAULT_TIMEOUT = 10_000;

// Refresh status every second: rtt, rate counters.
const STATUS_REFRESH_INTERVAL = 1000;

export type MessageListener = (message: Message) => void;
export type ReconnectListener = () => void;

export type MessengerConfig = {
  socketEndpoint: string;
  timeout?: number;
  protocol?: Protocol;
  disableAuth?: boolean;
};

export interface EdgeConnection extends Required<Lifecycle> {
  statusChanged: Event<EdgeStatus>;
  get info(): any;
  get identityKey(): string;
  get peerKey(): string;
  get isOpen(): boolean;
  get status(): EdgeStatus;
  setIdentity(identity: EdgeIdentity): void;
  send(message: Message): Promise<void>;
  onMessage(listener: MessageListener): () => void;
  onReconnected(listener: ReconnectListener): () => void;
}

/**
 * Messenger client for EDGE:
 *  - While open, uses PersistentLifecycle to keep an open EdgeWsConnection, reconnecting on failures.
 *  - Manages identity and re-create EdgeWsConnection when identity changes.
 *  - Dispatches connection state and message notifications.
 */
export class EdgeClient extends Resource implements EdgeConnection {
  public readonly statusChanged = new Event<EdgeStatus>();

  private readonly _persistentLifecycle = new PersistentLifecycle<EdgeWsConnection>({
    start: async () => this._connect(),
    stop: async (state: EdgeWsConnection) => this._disconnect(state),
  });

  private readonly _messageListeners = new Set<MessageListener>();
  private readonly _reconnectListeners = new Set<ReconnectListener>();
  private readonly _baseWsUrl: string;
  private readonly _baseHttpUrl: string;
  private _currentConnection?: EdgeWsConnection = undefined;
  private _ready = new Trigger();

  constructor(
    private _identity: EdgeIdentity,
    private readonly _config: MessengerConfig,
  ) {
    super();
    this._baseWsUrl = getEdgeUrlWithProtocol(_config.socketEndpoint, 'ws');
    this._baseHttpUrl = getEdgeUrlWithProtocol(_config.socketEndpoint, 'http');
  }

  @logInfo
  public get info() {
    return {
      open: this.isOpen,
      status: this.status,
      identity: this._identity.identityKey,
      device: this._identity.peerKey,
    };
  }

  get status(): EdgeStatus {
    return {
      state:
        Boolean(this._currentConnection) && this._ready.state === TriggerState.RESOLVED
          ? EdgeStatus.ConnectionState.CONNECTED
          : EdgeStatus.ConnectionState.NOT_CONNECTED,
      uptime: this._currentConnection?.uptime ?? 0,
      rtt: this._currentConnection?.rtt ?? 0,
      rateBytesUp: this._currentConnection?.uploadRate ?? 0,
      rateBytesDown: this._currentConnection?.downloadRate ?? 0,
    };
  }

  get identityKey() {
    return this._identity.identityKey;
  }

  get peerKey() {
    return this._identity.peerKey;
  }

  setIdentity(identity: EdgeIdentity) {
    if (identity.identityKey !== this._identity.identityKey || identity.peerKey !== this._identity.peerKey) {
      log('Edge identity changed', { identity, oldIdentity: this._identity });
      this._identity = identity;
      this._closeCurrentConnection(new EdgeIdentityChangedError());
      void this._persistentLifecycle.scheduleRestart();
    }
  }

  /**
   * Send message.
   * NOTE: The message is guaranteed to be delivered but the service must respond with a message to confirm processing.
   */
  public async send(message: Message) {
    if (this._ready.state !== TriggerState.RESOLVED) {
      log('waiting for websocket');
      await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    }

    if (!this._currentConnection) {
      throw new EdgeConnectionClosedError();
    }

    if (
      message.source &&
      (message.source.peerKey !== this._identity.peerKey || message.source.identityKey !== this.identityKey)
    ) {
      throw new EdgeIdentityChangedError();
    }

    this._currentConnection.send(message);
  }

  public onMessage(listener: MessageListener) {
    this._messageListeners.add(listener);
    return () => this._messageListeners.delete(listener);
  }

  public onReconnected(listener: () => void) {
    this._reconnectListeners.add(listener);
    if (this._ready.state === TriggerState.RESOLVED) {
      // Microtask so that listener is always called asynchronously, no matter the state of the ready trigger
      // at the moment of registration.
      scheduleMicroTask(this._ctx, () => {
        if (this._reconnectListeners.has(listener)) {
          try {
            listener();
          } catch (error) {
            log.catch(error);
          }
        }
      });
    }

    return () => this._reconnectListeners.delete(listener);
  }

  /**
   * Open connection to messaging service.
   */
  protected override async _open(): Promise<void> {
    log('opening...', { info: this.info });
    this._persistentLifecycle.open().catch((err) => {
      log.warn('Error while opening connection', { err });
    });

    // Notify about status changes (rtt, rate counters).
    scheduleTaskInterval(
      this._ctx,
      async () => {
        if (!this._currentConnection) {
          return;
        }
        this.statusChanged.emit(this.status);
      },
      STATUS_REFRESH_INTERVAL,
    );
  }

  /**
   * Close connection and free resources.
   */
  protected override async _close(): Promise<void> {
    log('closing...', { peerKey: this._identity.peerKey });
    this._closeCurrentConnection();
    await this._persistentLifecycle.close();
  }

  private async _connect(): Promise<EdgeWsConnection | undefined> {
    if (this._ctx.disposed) {
      return undefined;
    }

    const identity = this._identity;
    const path = `/ws/${identity.identityKey}/${identity.peerKey}`;
    const protocolHeader = this._config.disableAuth ? undefined : await this._createAuthHeader(path);
    if (this._identity !== identity) {
      log('identity changed during auth header request');
      return undefined;
    }

    const restartRequired = new Trigger();
    const url = new URL(path, this._baseWsUrl);
    log('Opening websocket', { url: url.toString(), protocolHeader });
    const connection = new EdgeWsConnection(
      identity,
      { url, protocolHeader },
      {
        onConnected: () => {
          if (this._isActive(connection)) {
            this._ready.wake();
            this._notifyReconnected();
          } else {
            log.verbose('connected callback ignored, because connection is not active');
          }
        },
        onRestartRequired: () => {
          if (this._isActive(connection)) {
            this._closeCurrentConnection();
            void this._persistentLifecycle.scheduleRestart();
          } else {
            log.verbose('restart requested by inactive connection');
          }
          restartRequired.wake();
        },
        onMessage: (message) => {
          if (this._isActive(connection)) {
            this._notifyMessageReceived(message);
          } else {
            log.verbose('ignored a message on inactive connection', {
              from: message.source,
              type: message.payload?.typeUrl,
            });
          }
        },
      },
    );
    this._currentConnection = connection;

    await connection.open();
    // Race with restartRequired so that restart is not blocked by _connect execution.
    // Wait on ready to attempt a reconnect if it times out.
    await Promise.race([this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT }), restartRequired]);
    return connection;
  }

  private async _disconnect(state: EdgeWsConnection): Promise<void> {
    await state.close();
    this.statusChanged.emit(this.status);
  }

  private _closeCurrentConnection(error: Error = new EdgeConnectionClosedError()): void {
    this._currentConnection = undefined;
    this._ready.throw(error);
    this._ready.reset();
    this.statusChanged.emit(this.status);
  }

  private _notifyReconnected(): void {
    this.statusChanged.emit(this.status);
    for (const listener of this._reconnectListeners) {
      try {
        listener();
      } catch (err) {
        log.error('ws reconnect listener failed', { err });
      }
    }
  }

  private _notifyMessageReceived(message: Message): void {
    for (const listener of this._messageListeners) {
      try {
        listener(message);
      } catch (err) {
        log.error('ws incoming message processing failed', { err, payload: protocol.getPayloadType(message) });
      }
    }
  }

  private async _createAuthHeader(path: string): Promise<string | undefined> {
    const httpUrl = new URL(path, this._baseHttpUrl);
    httpUrl.protocol = getEdgeUrlWithProtocol(this._baseWsUrl.toString(), 'http');
    const response = await fetch(httpUrl, { method: 'GET' });
    if (response.status === 401) {
      return encodePresentationWsAuthHeader(await handleAuthChallenge(response, this._identity));
    } else {
      log.warn('no auth challenge from edge', { status: response.status, statusText: response.statusText });
      return undefined;
    }
  }

  private _isActive = (connection: EdgeWsConnection) => connection === this._currentConnection;
}

const encodePresentationWsAuthHeader = (encodedPresentation: Uint8Array): string => {
  // '=' and '/' characters are not allowed in the WebSocket subprotocol header.
  const encodedToken = Buffer.from(encodedPresentation).toString('base64').replace(/=*$/, '').replaceAll('/', '|');
  return `base64url.bearer.authorization.dxos.org.${encodedToken}`;
};
