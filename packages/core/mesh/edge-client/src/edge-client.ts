//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';

import {
  type CleanupFn,
  Event,
  PersistentLifecycle,
  Trigger,
  TriggerState,
  scheduleMicroTask,
  scheduleTaskInterval,
} from '@dxos/async';
import { Context, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';
import { type Lifecycle, Resource } from '@dxos/context';
import { log, logInfo } from '@dxos/log';
import { EdgeCredentialsHeaderCodec } from '@dxos/protocols';
import { type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { trace } from '@dxos/tracing';

import { authenticateViaChallengeEndpoint, presentCredentialsForChallenge, readAuthChallenge } from './auth-challenge';
import { protocol } from './defs';
import { type EdgeIdentity } from './edge-identity';
import { EdgeWsConnection } from './edge-ws-connection';
import { EdgeConnectionClosedError, EdgeIdentityChangedError } from './errors';
import { type Protocol } from './protocol';
import { type ReconnectReason } from './reconnect-reason';
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
  /** Sent as `X-DXOS-Client-Tag` on the WebSocket upgrade (Node/`ws` only; ignored in browsers). */
  clientTag?: string;
  /**
   * When set, `open()` does not dial; the owner must call {@link EdgeClient.startNetworking}. Lets a
   * host that shares this thread with latency-sensitive work decide when connecting is safe — the
   * policy (and any delay) belongs to that owner, not here. Reconnects are unaffected.
   * @default false (dial on open)
   */
  deferConnect?: boolean;
};

export interface EdgeConnection extends Required<Lifecycle> {
  statusChanged: Event<EdgeStatus>;
  get info(): any;
  /** Identity DID (`did:halo:…`) of the connected identity. */
  get identityDid(): string;
  get peerKey(): string;
  get isOpen(): boolean;
  get status(): EdgeStatus;
  setIdentity(identity: EdgeIdentity): void;
  /** Begins dialing. Required only when constructed with `deferConnect`; otherwise a no-op repeat. */
  startNetworking(): void;
  send(ctx: Context, message: Message): Promise<void>;
  onMessage(listener: MessageListener): () => void;
  /**
   * Subscribe to connection (re-)establishment.
   *
   * By default the listener also fires once immediately when the connection is already ready at
   * subscription time — a current-state notification for late subscribers. Pass
   * `emitCurrentState: false` for reconnect-reaction logic (e.g. restarting a session): reacting
   * to the subscribe-time firing there causes restart loops, since each restart re-subscribes.
   */
  onReconnected(listener: ReconnectListener, opts?: { emitCurrentState?: boolean }): () => void;
}

/**
 * Effect service tag for {@link EdgeConnection}.
 */
export class EdgeConnectionService extends EffectContext.Service<EdgeConnectionService, EdgeConnection>()(
  '@dxos/edge-client/EdgeConnection',
) {}

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

  /** Guards {@link startNetworking} so the connection loop is only ever started once. */
  private _networkingStarted = false;
  private readonly _reconnectListeners = new Set<ReconnectListener>();
  /** Reconnects since this process started, which is what "per session" means for a browser client. */
  #sessionReconnects = 0;
  #metricsCleanup: CleanupFn[] = [];
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
      identity: this._identity.identityDid,
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
      messagesSent: this._currentConnection?.messagesSent ?? 0,
      messagesReceived: this._currentConnection?.messagesReceived ?? 0,
    };
  }

  get identityDid() {
    return this._identity.identityDid;
  }

  get peerKey() {
    return this._identity.peerKey;
  }

  setIdentity(identity: EdgeIdentity) {
    if (identity.identityDid !== this._identity.identityDid || identity.peerKey !== this._identity.peerKey) {
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
  public async send(ctx: Context, message: Message) {
    if (this._ready.state !== TriggerState.RESOLVED) {
      log('waiting for websocket');
      await this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT });
    }

    if (!this._currentConnection) {
      throw new EdgeConnectionClosedError();
    }

    // DX-1059: sources are DID-only; validate against identityDid.
    if (
      message.source &&
      (message.source.peerKey !== this._identity.peerKey || message.source.identityDid !== this.identityDid)
    ) {
      throw new EdgeIdentityChangedError();
    }

    const traceCtx = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE) as TraceContextData | undefined;
    if (traceCtx) {
      message.traceContext = {
        $typeName: 'dxos.edge.messenger.TraceContext',
        traceparent: traceCtx.traceparent,
        tracestate: traceCtx.tracestate,
      };
    }

    this._currentConnection.send(message);
  }

  public onMessage(listener: MessageListener) {
    this._messageListeners.add(listener);
    return () => this._messageListeners.delete(listener);
  }

  public onReconnected(listener: ReconnectListener, opts?: { emitCurrentState?: boolean }) {
    this._reconnectListeners.add(listener);
    if ((opts?.emitCurrentState ?? true) && this._ready.state === TriggerState.RESOLVED) {
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
   * Begins dialing (and keeps reconnecting). Idempotent, so an owner that calls it explicitly and a
   * later `open()` cannot start two connection loops. Returns without waiting for the socket.
   */
  startNetworking(): void {
    if (this._networkingStarted) {
      return;
    }
    this._networkingStarted = true;
    this._persistentLifecycle.open().catch((err) => {
      log.warn('Error while opening connection', { err });
    });
  }

  /**
   * Open connection to messaging service.
   */
  protected override async _open(): Promise<void> {
    log('opening...', { info: this.info });
    this.#registerMetrics();
    if (this._config.deferConnect) {
      log('deferring connection until startNetworking');
    } else {
      this.startNetworking();
    }

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
    for (const cleanup of this.#metricsCleanup) {
      cleanup();
    }
    this.#metricsCleanup = [];
    this._closeCurrentConnection();
    await this._persistentLifecycle.close();
  }

  private async _connect(): Promise<EdgeWsConnection | undefined> {
    if (this._ctx.disposed) {
      return undefined;
    }

    const identity = this._identity;
    const path = `/ws/${identity.identityDid}/${identity.peerKey}`;
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
      {
        url,
        protocolHeader,
        headers: this._config.clientTag ? { 'X-DXOS-Client-Tag': this._config.clientTag } : undefined,
      },
      {
        onConnected: () => {
          if (this._isActive(connection)) {
            this._ready.wake();
            this._notifyReconnected();
          } else {
            log.verbose('connected callback ignored, because connection is not active');
          }
        },
        onRestartRequired: (reason) => {
          if (this._isActive(connection)) {
            this._recordReconnect(reason);
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

    // The connection is only a successful start once the socket becomes ready. A socket that
    // closes or errors before becoming ready (or never connects within the timeout) is a failed
    // start: throwing lets PersistentLifecycle apply its backoff. Returning here would mark the
    // attempt as successful and reset the backoff, degenerating reconnects into a hot loop when
    // the server accepts then immediately drops the socket.
    const becameReady = await Promise.race([
      this._ready.wait({ timeout: this._config.timeout ?? DEFAULT_TIMEOUT }).then(
        () => true,
        () => false,
      ),
      restartRequired.wait().then(() => false),
    ]);
    if (!becameReady) {
      throw new EdgeConnectionClosedError();
    }

    return connection;
  }

  /** Registers the observed gauges. Idempotent, so an owner that calls `connect` twice is harmless. */
  #registerMetrics(): void {
    if (this.#metricsCleanup.length > 0) {
      return;
    }

    this.#metricsCleanup.push(
      trace.metrics.observe('dxos.edge.ws.session.reconnects', () => this.#sessionReconnects, {
        unit: '{reconnect}',
      }),
      // Averaged across clients this is the fraction of the fleet currently online, which a
      // counter cannot express.
      trace.metrics.observe('dxos.edge.ws.connected', () => (this._currentConnection ? 1 : 0), { unit: '1' }),
    );
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

  /**
   * Publishes one reconnect.
   * The counter answers "how often, and why" across the fleet; the session gauge answers "how bad
   * is this one client's session", which a delta counter cannot — it resets with the process, so
   * its value IS the per-session total.
   */
  private _recordReconnect(reason: ReconnectReason): void {
    this.#sessionReconnects++;
    log('edge ws reconnect', { reason, sessionReconnects: this.#sessionReconnects });
    trace.metrics.increment('dxos.edge.ws.reconnect.count', 1, {
      unit: '{reconnect}',
      tags: { reason },
    });
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

  /**
   * Obtain the challenge from `/auth` and sign it into the WebSocket subprotocol auth header.
   *
   * This used to fire a GET at the `/ws/:identityDid/:peerKey` upgrade path itself and harvest the
   * challenge off the resulting 401 — a request sent specifically to be rejected, which surfaced as
   * a console error on every connect and as a routine auth failure in the server's audit trail.
   * `/auth` answers the same challenge with a 200. The nonce is not bound to a path, so the
   * challenge issued at `/auth` is equally valid for the upgrade request.
   *
   * Falls back to the old behaviour when `/auth` yields nothing, so this still connects to servers
   * that predate the challenge endpoint.
   */
  private async _createAuthHeader(path: string): Promise<string | undefined> {
    const authentication = await authenticateViaChallengeEndpoint(this._baseHttpUrl, this._identity);
    if (authentication) {
      return encodePresentationWsAuthHeader(authentication.presentation);
    }

    const response = await fetch(new URL(path, this._baseHttpUrl), { method: 'GET' });
    // Gate on a parsed VP challenge, not merely on a 401. A 401 forwarded from upstream can carry
    // an unrelated `WWW-Authenticate` (or none), and signing a challenge that isn't there would
    // throw instead of degrading to an unauthenticated attempt.
    const challenge = response.status === 401 ? await readAuthChallenge(response) : undefined;
    if (challenge) {
      return encodePresentationWsAuthHeader(await presentCredentialsForChallenge(this._identity, challenge));
    }
    log.warn('no auth challenge from edge', { status: response.status, statusText: response.statusText });
    return undefined;
  }

  private _isActive = (connection: EdgeWsConnection) => connection === this._currentConnection;
}

const encodePresentationWsAuthHeader = (encodedPresentation: Uint8Array): string =>
  EdgeCredentialsHeaderCodec.encodeWebSocketProtocol(encodedPresentation);
