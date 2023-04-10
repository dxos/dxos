//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { CommandTrace, SignalClient, SignalStatus } from '../signal-client';
import { SignalManager } from './signal-manager';

/**
 * Manages connection to multiple Signal Servers over WebSocket
 */
export class WebsocketSignalManager implements SignalManager {
  private readonly _servers = new Map<string, SignalClient>();

  private _ctx!: Context;
  private _opened = false;

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
  public _traceParent?: string;

  // prettier-ignore
  constructor(
    private readonly _hosts: string[]
  ) {
    log('Created WebsocketSignalManager', { hosts: this._hosts });
    for (const host of this._hosts) {
      const server = new SignalClient(host, async (message) => this.onMessage.emit(message));
      server._traceParent = this._instanceId;
      // TODO(mykola): Add subscription group
      server.swarmEvent.on((data) => this.swarmEvent.emit(data));
      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host, server);
      server.commandTrace.on((trace) => this.commandTrace.emit(trace));
    }
  }

  @synchronized
  async open() {
    if (this._opened) {
      return;
    }
    log('open signal manager', { hosts: this._hosts });
    log.trace('dxos.mesh.websocket-signal-manager', trace.begin({ id: this._instanceId, parentId: this._traceParent }));

    this._initContext();

    [...this._servers.values()].forEach((server) => server.open());

    this._opened = true;
  }

  async close() {
    if (!this._opened) {
      return;
    }
    this._opened = false;

    await this._ctx.dispose();

    await Promise.all(Array.from(this._servers.values()).map((server) => server.close()));
    log.trace('dxos.mesh.websocket-signal-manager', trace.end({ id: this._instanceId }));
  }

  getStatus(): SignalStatus[] {
    return Array.from(this._servers.values()).map((server) => server.getStatus());
  }

  @synchronized
  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('Join', { topic, peerId });
    assert(this._opened, 'Closed');
    await this._forEachServer((server) => server.join({ topic, peerId }));
  }

  @synchronized
  async leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('leaving', { topic, peerId });
    assert(this._opened, 'Closed');

    await this._forEachServer((server) => server.leave({ topic, peerId }));
  }

  async sendMessage({
    author,
    recipient,
    payload
  }: {
    author: PublicKey;
    recipient: PublicKey;
    payload: Any;
  }): Promise<void> {
    log(`Signal ${recipient}`);
    assert(this._opened, 'Closed');

    void this._forEachServer(async (server) => {
      void server.sendMessage({ author, recipient, payload }).catch((err) => log(err));
    });
  }

  async subscribeMessages(peerId: PublicKey) {
    log(`Subscribed for message stream peerId=${peerId}`);
    assert(this._opened, 'Closed');

    const unsubscribeHandles = this._forEachServer(async (server) => server.subscribeMessages(peerId));

    // TODO(mykola): on multiple subscription for same peerId, everybody will receive same unsubscribe handle.
    return {
      unsubscribe: async () => {
        await Promise.all((await unsubscribeHandles).map((handle) => handle.unsubscribe()));
      }
    };
  }

  private _initContext() {
    this._ctx = new Context({
      onError: (err) => log.catch(err)
    });
  }

  private async _forEachServer(fn: (server: SignalClient) => Promise<any>) {
    return Promise.all(Array.from(this._servers.values()).map(fn));
  }
}
