//
// Copyright 2020 DXOS.org
//

import { Event, sleep, synchronized } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { RateLimitExceededError, trace } from '@dxos/protocols';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { SignalManager } from './signal-manager';
import { CommandTrace, SignalClient, SignalStatus } from '../signal-client';

const MAX_SERVER_FAILURES = 5;
const WSS_SIGNAL_SERVER_REBOOT_DELAY = 3_000;
/**
 * Manages connection to multiple Signal Servers over WebSocket
 */
export class WebsocketSignalManager implements SignalManager {
  private readonly _servers = new Map<string, SignalClient>();

  private _ctx!: Context;
  private _opened = false;

  readonly failureCount = new Map<string, number>();
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly commandTrace = new Event<CommandTrace>();
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

  constructor(private readonly _hosts: Runtime.Services.Signal[]) {
    log('Created WebsocketSignalManager', { hosts: this._hosts });
    for (const host of this._hosts) {
      if (this._servers.has(host.server)) {
        continue;
      }
      const server = new SignalClient(
        host.server,
        async (message) => this.onMessage.emit(message),
        async (data) => this.swarmEvent.emit(data),
      );
      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host.server, server);
      this.failureCount.set(host.server, 0);
      server.commandTrace.on((trace) => this.commandTrace.emit(trace));
    }
  }

  @synchronized
  async open() {
    if (this._opened) {
      return;
    }
    log('open signal manager', { hosts: this._hosts });
    log.trace('dxos.mesh.websocket-signal-manager.open', trace.begin({ id: this._instanceId }));

    this._initContext();

    [...this._servers.values()].forEach((server) => server.open());

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

    await Promise.all(Array.from(this._servers.values()).map((server) => server.close()));
  }

  async restartServer(serverName: string) {
    log('Restarting server', { serverName });
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
    log('Join', { topic, peerId });
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
    log(`Signal ${recipient.truncate()}`);
    invariant(this._opened, 'Closed');

    void this._forEachServer(async (server, serverName) => {
      void server.sendMessage({ author, recipient, payload }).catch((err) => {
        if (err instanceof RateLimitExceededError) {
          log('WSS rate limit exceeded', { err });
        } else {
          log(`error sending to ${serverName}`, { err });
          void this.checkServerFailure(serverName);
        }
      });
    });
  }

  @synchronized
  async checkServerFailure(serverName: string) {
    const failureCount = this.failureCount.get(serverName!) ?? 0;
    if (failureCount > MAX_SERVER_FAILURES) {
      log.warn(`Too many failures sending to ${serverName} (${failureCount} > ${MAX_SERVER_FAILURES}), restarting`);
      await this.restartServer(serverName!);
      this.failureCount.set(serverName!, 0);
      return;
    }
    this.failureCount.set(serverName!, (this.failureCount.get(serverName!) ?? 0) + 1);
  }

  async subscribeMessages(peerId: PublicKey) {
    log(`Subscribed for message stream peerId=${peerId}`);
    invariant(this._opened, 'Closed');

    await this._forEachServer(async (server) => server.subscribeMessages(peerId));
  }

  async unsubscribeMessages(peerId: PublicKey) {
    log(`Subscribed for message stream peerId=${peerId}`);
    invariant(this._opened, 'Closed');

    await this._forEachServer(async (server) => server.unsubscribeMessages(peerId));
  }

  private _initContext() {
    this._ctx = new Context({
      onError: (err) => log.catch(err),
    });
  }

  private async _forEachServer<ReturnType>(
    fn: (server: SignalClient, serverName: string) => Promise<ReturnType>,
  ): Promise<ReturnType[]> {
    return Promise.all(Array.from(this._servers.entries()).map(([serverName, server]) => fn(server, serverName)));
  }
}
