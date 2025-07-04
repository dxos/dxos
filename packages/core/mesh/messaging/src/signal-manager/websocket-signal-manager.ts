//
// Copyright 2020 DXOS.org
//

import { Event, sleep, synchronized } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { RateLimitExceededError, TimeoutError, trace } from '@dxos/protocols';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type JoinRequest, type LeaveRequest, type QueryRequest } from '@dxos/protocols/proto/dxos/edge/signal';
import { BitField, safeAwaitAll } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { WebsocketSignalManagerMonitor } from './websocket-signal-manager-monitor';
import { SignalClient } from '../signal-client';
import {
  type PeerInfo,
  type Message,
  type SignalClientMethods,
  type SignalMethods,
  type SignalStatus,
  type SwarmEvent,
} from '../signal-methods';

const MAX_SERVER_FAILURES = 5;
const WSS_SIGNAL_SERVER_REBOOT_DELAY = 3_000;

/**
 * Manages connection to multiple Signal Servers over WebSocket
 * TODO(mykola): Delete.
 * @deprecated
 */
export class WebsocketSignalManager extends Resource implements SignalManager {
  private readonly _servers = new Map<string, SignalClientMethods>();
  private readonly _monitor = new WebsocketSignalManagerMonitor();

  /**
   * Used to avoid logging failed server restarts more than once until the server actually recovers.
   */
  private readonly _failedServersBitfield: Uint8Array;

  readonly failureCount = new Map<string, number>();
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly swarmEvent = new Event<SwarmEvent>();

  readonly onMessage = new Event<Message>();

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    private readonly _hosts: Runtime.Services.Signal[],
    private readonly _getMetadata?: () => any,
  ) {
    super();
    log('Created WebsocketSignalManager', { hosts: this._hosts });
    for (const host of this._hosts) {
      if (this._servers.has(host.server)) {
        continue;
      }

      // TODO(burdon): Create factory to support different variants.
      const server = new SignalClient(host.server, this._getMetadata);
      server.swarmEvent.on((data) => this.swarmEvent.emit(data));
      server.onMessage.on((data) => this.onMessage.emit(data));

      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host.server, server);
      this.failureCount.set(host.server, 0);
    }
    this._failedServersBitfield = BitField.zeros(this._hosts.length);
  }

  protected override async _open(): Promise<void> {
    log('open signal manager', { hosts: this._hosts });
    log.trace('dxos.mesh.websocket-signal-manager.open', trace.begin({ id: this._instanceId }));

    await safeAwaitAll(this._servers.values(), (server) => server.open());

    log.trace('dxos.mesh.websocket-signal-manager.open', trace.end({ id: this._instanceId }));
  }

  protected override async _close(): Promise<void> {
    await safeAwaitAll(this._servers.values(), (server) => server.close());
  }

  async restartServer(serverName: string): Promise<void> {
    log('restarting server', { serverName });
    invariant(this._lifecycleState === LifecycleState.OPEN);

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
  async join({ topic, peer }: JoinRequest): Promise<void> {
    log('join', { topic, peer });
    invariant(this._lifecycleState === LifecycleState.OPEN);
    await this._forEachServer((server) => server.join({ topic, peer }));
  }

  @synchronized
  async leave({ topic, peer }: LeaveRequest): Promise<void> {
    log('leaving', { topic, peer });
    invariant(this._lifecycleState === LifecycleState.OPEN);
    await this._forEachServer((server) => server.leave({ topic, peer }));
  }

  async query({ topic }: QueryRequest): Promise<SwarmResponse> {
    throw new Error('Not implemented');
  }

  async sendMessage({ author, recipient, payload }: Message): Promise<void> {
    log('signal', { recipient });
    invariant(this._lifecycleState === LifecycleState.OPEN);

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
  async checkServerFailure(serverName: string, index: number): Promise<void> {
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

  private _clearServerFailedFlag(serverName: string, index: number): void {
    if (BitField.get(this._failedServersBitfield, index)) {
      log.info('server connection restored', { serverName });
      BitField.set(this._failedServersBitfield, index, false);
      this.failureCount.set(serverName!, 0);
    }
  }

  async subscribeMessages(peer: PeerInfo): Promise<void> {
    log('subscribed for message stream', { peer });
    invariant(this._lifecycleState === LifecycleState.OPEN);

    await this._forEachServer(async (server) => server.subscribeMessages(peer));
  }

  async unsubscribeMessages(peer: PeerInfo): Promise<void> {
    log('subscribed for message stream', { peer });
    invariant(this._lifecycleState === LifecycleState.OPEN);

    await this._forEachServer(async (server) => server.unsubscribeMessages(peer));
  }

  private async _forEachServer<ReturnType>(
    fn: (server: SignalMethods, serverName: string, index: number) => Promise<ReturnType>,
  ): Promise<ReturnType[]> {
    return Promise.all(
      Array.from(this._servers.entries()).map(([serverName, server], idx) => fn(server, serverName, idx)),
    );
  }
}
