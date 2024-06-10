//
// Copyright 2020 DXOS.org
//

import { DeferredTask, Event, Trigger, scheduleTask, scheduleTaskInterval, sleep } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { type Context, cancelWithContext, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { SignalState, type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { SignalClientMonitor } from './signal-client-monitor';
import { SignalLocalState } from './signal-local-state';
import { SignalRPCClient } from './signal-rpc-client';
import { type Message, type SignalClientMethods, type SignalStatus } from '../signal-methods';

const DEFAULT_RECONNECT_TIMEOUT = 100;
const MAX_RECONNECT_TIMEOUT = 5_000;
const ERROR_RECONCILE_DELAY = 1_000;
const RECONCILE_INTERVAL = 5_000;

/**
 * KUBE-specific signaling client.
 * Establishes a websocket connection to signal server and provides RPC methods.
 * Subscription state updates are executed immediately against the local state which
 * is reconciled periodically.
 */
// TODO(burdon): Rename impl.
export class SignalClient extends Resource implements SignalClientMethods {
  private readonly _monitor = new SignalClientMonitor();

  private _state = SignalState.CLOSED;
  private _lastError?: Error;
  private _lastReconciliationFailed = false;

  private readonly _clientReady = new Trigger();
  private _connectionCtx?: Context;
  private _client?: SignalRPCClient;

  private _reconcileTask?: DeferredTask;
  private _reconnectTask?: DeferredTask;

  /**
   * Number of milliseconds after which the connection will be attempted again in case of error.
   */
  private _reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;

  private readonly _instanceId = PublicKey.random().toHex();

  /**
   * @internal
   */
  readonly localState: SignalLocalState;

  readonly statusChanged = new Event<SignalStatus>();

  /**
   * @param _host Signal server websocket URL.
   * @param onMessage called when a new message is received.
   * @param onSwarmEvent called when a new swarm event is received.
   * @param _getMetadata signal-message metadata provider, called for every message.
   */
  constructor(
    private readonly _host: string,
    onMessage: (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>,
    onSwarmEvent: (params: { topic: PublicKey; swarmEvent: SwarmEvent }) => Promise<void>,
    private readonly _getMetadata?: () => any,
  ) {
    super();
    if (!this._host.startsWith('wss://') && !this._host.startsWith('ws://')) {
      throw new Error(`Signal server requires a websocket URL. Provided: ${this._host}`);
    }

    this.localState = new SignalLocalState((message) => {
      this._monitor.recordMessageReceived(message);
      return onMessage(message);
    }, onSwarmEvent);
  }

  protected override async _open() {
    log.trace('dxos.mesh.signal-client.open', trace.begin({ id: this._instanceId }));

    if ([SignalState.CONNECTED, SignalState.CONNECTING].includes(this._state)) {
      return;
    }
    this._setState(SignalState.CONNECTING);

    this._reconcileTask = new DeferredTask(this._ctx, async () => {
      try {
        await cancelWithContext(this._connectionCtx!, this._clientReady.wait({ timeout: 5_000 }));
        invariant(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');
        await this.localState.reconcile(this._connectionCtx!, this._client!);
        this._monitor.recordReconciliation({ success: true });
        this._lastReconciliationFailed = false;
      } catch (err) {
        this._lastReconciliationFailed = true;
        this._monitor.recordReconciliation({ success: false });
        throw err;
      }
    });

    // Reconcile subscriptions periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        if (this._state === SignalState.CONNECTED) {
          this._reconcileTask!.schedule();
        }
      },
      RECONCILE_INTERVAL,
    );

    this._reconnectTask = new DeferredTask(this._ctx, async () => {
      await this._reconnect();
    });

    this._createClient();
    log.trace('dxos.mesh.signal-client.open', trace.end({ id: this._instanceId }));
  }

  protected override async _catch(err: Error) {
    if (this._state === SignalState.CLOSED || this._ctx.disposed) {
      return;
    }
    // Don't log consecutive reconciliation failures.
    if (this._state === SignalState.CONNECTED && !this._lastReconciliationFailed) {
      log.warn('SignalClient error:', err);
    }
    this._scheduleReconcileAfterError();
  }

  protected override async _close() {
    log('closing...');
    if ([SignalState.CLOSED].includes(this._state)) {
      return;
    }

    this._setState(SignalState.CLOSED);
    await this._safeResetClient();

    log('closed');
  }

  getStatus(): SignalStatus {
    return {
      host: this._host,
      state: this._state,
      error: this._lastError?.message,
      reconnectIn: this._reconnectAfter,
      ...this._monitor.getRecordedTimestamps(),
    };
  }

  async join(args: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    log('joining', { topic: args.topic, peerId: args.peerId });
    this._monitor.recordJoin();
    this.localState.join(args);
    this._reconcileTask?.schedule();
  }

  async leave(args: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    log('leaving', { topic: args.topic, peerId: args.peerId });
    this._monitor.recordLeave();
    this.localState.leave(args);
  }

  async sendMessage(msg: Message): Promise<void> {
    return this._monitor.recordMessageSending(msg, async () => {
      await this._clientReady.wait();
      invariant(this._state === SignalState.CONNECTED, 'Not connected to Signal Server');
      await this._client!.sendMessage(msg);
    });
  }

  async subscribeMessages(peerId: PublicKey) {
    log('subscribing to messages', { peerId });
    this.localState.subscribeMessages(peerId);
    this._reconcileTask?.schedule();
  }

  async unsubscribeMessages(peerId: PublicKey) {
    log('unsubscribing from messages', { peerId });
    this.localState.unsubscribeMessages(peerId);
  }

  private _scheduleReconcileAfterError() {
    scheduleTask(this._ctx, () => this._reconcileTask!.schedule(), ERROR_RECONCILE_DELAY);
  }

  private _createClient() {
    log('creating client', { host: this._host, state: this._state });
    invariant(!this._client, 'Client already created');

    this._monitor.recordConnectionStartTime();

    // Create new context for each connection.
    this._connectionCtx = this._ctx.derive();
    this._connectionCtx.onDispose(async () => {
      log('connection context disposed');
      const { failureCount } = await this.localState.safeCloseStreams();
      this._monitor.recordStreamCloseErrors(failureCount);
    });

    try {
      const client = new SignalRPCClient({
        url: this._host,
        callbacks: {
          onConnected: () => {
            if (client === this._client) {
              log('socket connected');
              this._onConnected();
            }
          },

          onDisconnected: () => {
            if (client !== this._client) {
              return;
            }
            log('socket disconnected', { state: this._state });
            if (this._state === SignalState.ERROR) {
              // Ignore disconnects after error.
              // Handled by error handler before disconnect handler.
              this._setState(SignalState.DISCONNECTED);
            } else {
              this._onDisconnected();
            }
          },

          onError: (error) => {
            if (client === this._client) {
              log('socket error', { error, state: this._state });
              this._onDisconnected({ error });
            }
          },
          getMetadata: this._getMetadata,
        },
      });
      this._client = client;
    } catch (error: any) {
      this._client = undefined;
      this._onDisconnected({ error });
    }
  }

  private async _reconnect() {
    log(`reconnecting in ${this._reconnectAfter}ms`, { state: this._state });
    this._monitor.recordReconnect();

    if (this._state === SignalState.RECONNECTING) {
      log.info('Signal api already reconnecting.');
      return;
    }
    if (this._state === SignalState.CLOSED) {
      return;
    }
    this._setState(SignalState.RECONNECTING);

    await this._safeResetClient();

    await cancelWithContext(this._ctx!, sleep(this._reconnectAfter));

    this._createClient();
  }

  private _onConnected() {
    this._lastError = undefined;
    this._lastReconciliationFailed = false;
    this._reconnectAfter = DEFAULT_RECONNECT_TIMEOUT;
    this._setState(SignalState.CONNECTED);
    this._clientReady.wake();
    this._reconcileTask!.schedule();
  }

  private _onDisconnected(options?: { error: Error }) {
    this._updateReconnectTimeout();
    if (this._state === SignalState.CLOSED) {
      return;
    }
    if (options?.error) {
      this._lastError = options.error;
      this._setState(SignalState.ERROR);
    } else {
      this._setState(SignalState.DISCONNECTED);
    }
    this._reconnectTask!.schedule();
  }

  private _setState(newState: SignalState) {
    this._state = newState;
    this._monitor.recordStateChangeTime();
    log('signal state changed', { status: this.getStatus() });
    this.statusChanged.emit(this.getStatus());
  }

  private _updateReconnectTimeout() {
    if (this._state !== SignalState.CONNECTED && this._state !== SignalState.CONNECTING) {
      this._reconnectAfter *= 2;
      this._reconnectAfter = Math.min(this._reconnectAfter, MAX_RECONNECT_TIMEOUT);
    }
  }

  private async _safeResetClient() {
    await this._connectionCtx?.dispose();
    this._connectionCtx = undefined;

    this._clientReady.reset();
    await this._client?.close().catch(() => {});
    this._client = undefined;
  }
}
