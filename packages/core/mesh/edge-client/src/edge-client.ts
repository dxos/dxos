//
// Copyright 2024 DXOS.org
//

import { Trigger, scheduleMicroTask, TriggerState } from '@dxos/async';
import { Resource, type Lifecycle } from '@dxos/context';
import { log, logInfo } from '@dxos/log';
import { type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { EdgeWsConnection } from './edge-ws-connection';
import { EdgeConnectionClosedError, EdgeIdentityChangedError } from './errors';
import { PersistentLifecycle } from './persistent-lifecycle';
import { type Protocol } from './protocol';
import { getEdgeUrlWithProtocol } from './utils';

const DEFAULT_TIMEOUT = 10_000;

export type MessageListener = (message: Message) => void;
export type ReconnectListener = () => void;

export interface EdgeConnection extends Required<Lifecycle> {
  get info(): any;
  get identityKey(): string;
  get peerKey(): string;
  get isOpen(): boolean;
  get isConnected(): boolean;
  setIdentity(identity: EdgeIdentity): void;
  onMessage(listener: MessageListener): () => void;
  onReconnected(listener: ReconnectListener): () => void;
  send(message: Message): Promise<void>;
}

export type MessengerConfig = {
  socketEndpoint: string;
  timeout?: number;
  protocol?: Protocol;
  disableAuth?: boolean;
};

/**
 * Messenger client for EDGE:
 *  - While open, uses PersistentLifecycle to keep an open EdgeWsConnection, reconnecting on failures.
 *  - Manages identity and re-create EdgeWsConnection when identity changes.
 *  - Dispatches connection state and message notifications.
 */
export class EdgeClient extends Resource implements EdgeConnection {
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
      identity: this._identity.identityKey,
      device: this._identity.peerKey,
    };
  }

  get isConnected() {
    return Boolean(this._currentConnection) && this._ready.state === TriggerState.RESOLVED;
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
      this._persistentLifecycle.scheduleRestart();
    }
  }

  public onMessage(listener: MessageListener): () => void {
    this._messageListeners.add(listener);
    return () => this._messageListeners.delete(listener);
  }

  public onReconnected(listener: () => void): () => void {
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
  protected override async _open() {
    log('opening...', { info: this.info });
    this._persistentLifecycle.open().catch((err) => {
      log.warn('Error while opening connection', { err });
    });
  }

  /**
   * Close connection and free resources.
   */
  protected override async _close() {
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
            this._persistentLifecycle.scheduleRestart();
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

  private async _disconnect(state: EdgeWsConnection) {
    await state.close();
  }

  private _closeCurrentConnection(error: Error = new EdgeConnectionClosedError()) {
    this._currentConnection = undefined;
    this._ready.throw(error);
    this._ready.reset();
  }

  private _notifyReconnected() {
    for (const listener of this._reconnectListeners) {
      try {
        listener();
      } catch (err) {
        log.error('ws reconnect listener failed', { err });
      }
    }
  }

  private _notifyMessageReceived(message: Message) {
    for (const listener of this._messageListeners) {
      try {
        listener(message);
      } catch (err) {
        log.error('ws incoming message processing failed', { err, payload: protocol.getPayloadType(message) });
      }
    }
  }

  /**
   * Send message.
   * NOTE: The message is guaranteed to be delivered but the service must respond with a message to confirm processing.
   */
  public async send(message: Message): Promise<void> {
    if (this._ready.state !== TriggerState.RESOLVED) {
      log('waiting for websocket to become ready');
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
  // = and / characters are not allowed in the WebSocket subprotocol header.
  const encodedToken = Buffer.from(encodedPresentation).toString('base64').replace(/=*$/, '').replaceAll('/', '|');
  return `base64url.bearer.authorization.dxos.org.${encodedToken}`;
};
