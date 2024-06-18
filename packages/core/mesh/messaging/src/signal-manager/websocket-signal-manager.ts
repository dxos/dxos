//
// Copyright 2020 DXOS.org
//

import { Event, sleep, synchronized } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { RateLimitExceededError, TimeoutError, trace } from '@dxos/protocols';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { BitField, safeAwaitAll } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { WebsocketSignalManagerMonitor } from './websocket-signal-manager-monitor';
import { SignalClient } from '../signal-client';
import { type SignalClientMethods, type SignalMethods, type SignalStatus } from '../signal-methods';

const MAX_SERVER_FAILURES = 5;
const WSS_SIGNAL_SERVER_REBOOT_DELAY = 3_000;

/**
 * Manages connection to multiple Signal Servers over WebSocket
 */
export class WebsocketSignalManager implements SignalManager {
  private readonly _servers = new Map<string, SignalClientMethods>();
  private readonly _monitor = new WebsocketSignalManagerMonitor();

  /**
   * Used to avoid logging failed server restarts more than once until the server actually recovers.
   */
  private readonly _failedServersBitfield: Uint8Array;

  private _ctx!: Context;
  private _opened = false;

  readonly failureCount = new Map<string, number>();
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly swarmEvent = new Event<{
    topic: PublicKey;
    swarmEvent: SwarmEvent;
  }>();

  readonly onMessage = new Event<{
    author: PublicKey;
    recipient: PublicKey;
    payload: Any;
  }>();

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    private readonly _hosts: Runtime.Services.Signal[],
    private readonly _getMetadata?: () => any,
  ) {
    log('Created WebsocketSignalManager', { hosts: this._hosts });
    for (const host of this._hosts) {
      if (this._servers.has(host.server)) {
        continue;
      }

      // TODO(burdon): Create factory to support different variants.
      const server = new SignalClient(
        host.server,
        async (message) => this.onMessage.emit(message),
        async (data) => this.swarmEvent.emit(data),
        this._getMetadata,
      );

      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host.server, server);
      this.failureCount.set(host.server, 0);
    }
    this._failedServersBitfield = BitField.zeros(this._hosts.length);
  }

  @synchronized
  async open() {
    if (this._opened) {
      return;
    }
    log('open signal manager', { hosts: this._hosts });
    log.trace('dxos.mesh.websocket-signal-manager.open', trace.begin({ id: this._instanceId }));

    this._initContext();

    await safeAwaitAll(this._servers.values(), (server) => server.open());

    this._opened = true;
    log.trace('dxos.mesh.websocket-signal-manager.open', trace.end({ id: this._instanceId }));
  }

  @synchronized
  async close() {
    if (!this._opened) {
      return;
    }
    this._opened = false;
    await this._ctx.dispose();
    await safeAwaitAll(this._servers.values(), (server) => server.close());
  }

  async restartServer(serverName: string) {
    log('restarting server', { serverName });
    invariant(this._opened, 'server already closed');

    const server = this._servers.get(serverName);
    invariant(server, 'server not found');

    await server.close();
    await sleep(WSS_SIGNAL_SERVER_REBOOT_DELAY);
    await server.open();
  }

  getStatus(): SignalStatus[] {
    return Array.from(this._servers.values()).map((server) => server.getStatus());
  }

  @synchronized
  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('join', { topic, peerId });
    invariant(this._opened, 'Closed');
    await this._forEachServer((server) => server.join({ topic, peerId }));
  }

  @synchronized
  async leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('leaving', { topic, peerId });
    invariant(this._opened, 'Closed');
    await this._forEachServer((server) => server.leave({ topic, peerId }));
  }

  async sendMessage({
    author,
    recipient,
    payload,
  }: {
    author: PublicKey;
    recipient: PublicKey;
    payload: Any;
  }): Promise<void> {
    log('signal', { recipient });
    invariant(this._opened, 'Closed');

    void this._forEachServer(async (server, serverName, index) => {
      void server
        .sendMessage({ author, recipient, payload })
        .then(() => this._clearServerFailedFlag(serverName, index))
        .catch((err) => {
          if (err instanceof RateLimitExceededError) {
            log.info('WSS rate limit exceeded', { err });
            this._monitor.recordRateLimitExceeded();
          } else if (err instanceof TimeoutError || err.constructor.name === 'TimeoutError') {
            log.info('WSS sendMessage timeout', { err });
            void this.checkServerFailure(serverName, index);
          } else {
            log.warn(`error sending to ${serverName}`, { err });
            void this.checkServerFailure(serverName, index);
          }
        });
    });
  }

  @synchronized
  async checkServerFailure(serverName: string, index: number) {
    const failureCount = this.failureCount.get(serverName!) ?? 0;
    const isRestartRequired = failureCount > MAX_SERVER_FAILURES;
    this._monitor.recordServerFailure({ serverName, willRestart: isRestartRequired });
    if (isRestartRequired) {
      if (!BitField.get(this._failedServersBitfield, index)) {
        log.warn('too many failures for ws-server, restarting', { serverName, failureCount });
        BitField.set(this._failedServersBitfield, index, true);
      }
      await this.restartServer(serverName!);
      this.failureCount.set(serverName!, 0);
      return;
    }

    this.failureCount.set(serverName!, (this.failureCount.get(serverName!) ?? 0) + 1);
  }

  private _clearServerFailedFlag(serverName: string, index: number) {
    if (BitField.get(this._failedServersBitfield, index)) {
      log.info('server connection restored', { serverName });
      BitField.set(this._failedServersBitfield, index, false);
      this.failureCount.set(serverName!, 0);
    }
  }

  async subscribeMessages(peerId: PublicKey) {
    log('subscribed for message stream', { peerId });
    invariant(this._opened, 'Closed');

    await this._forEachServer(async (server) => server.subscribeMessages(peerId));
  }

  async unsubscribeMessages(peerId: PublicKey) {
    log('subscribed for message stream', { peerId });
    invariant(this._opened, 'Closed');

    await this._forEachServer(async (server) => server.unsubscribeMessages(peerId));
  }

  private _initContext() {
    this._ctx = new Context({
      onError: (err) => log.catch(err),
    });
  }

  private async _forEachServer<ReturnType>(
    fn: (server: SignalMethods, serverName: string, index: number) => Promise<ReturnType>,
  ): Promise<ReturnType[]> {
    return Promise.all(
      Array.from(this._servers.entries()).map(([serverName, server], idx) => fn(server, serverName, idx)),
    );
  }
}
