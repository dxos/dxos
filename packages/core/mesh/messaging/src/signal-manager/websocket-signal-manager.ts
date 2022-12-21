//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { CommandTrace, SignalClient, SignalStatus } from '../signal-client';
import { SignalManager } from './signal-manager';

/**
 * Manages connection to multiple Signal Servers over WebSocket
 */
export class WebsocketSignalManager implements SignalManager {
  private readonly _servers = new Map<string, SignalClient>();

  /** Topics joined: topic => peerId */
  private readonly _topicsJoined = new ComplexMap<PublicKey, PublicKey>((topic) => topic.toHex());

  /** host => topic => peerId */
  private readonly _topicsJoinedPerSignal = new Map<string, ComplexMap<PublicKey, PublicKey>>();

  /** peerId[] */
  private readonly _subscribedMessages = new ComplexSet<PublicKey>(PublicKey.hash);

  private _reconciling?: boolean = false;
  private _reconcileTimeoutId?: NodeJS.Timeout;
  private _closed = false;

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

  // prettier-ignore
  constructor(
    private readonly _hosts: string[]
  ) {
    log(`Created WebsocketSignalManager with signal servers: ${_hosts}`);
    assert(_hosts.length === 1, 'Only a single signaling server connection is supported');
    for (const host of this._hosts) {
      const server = new SignalClient(host, async (message) => this.onMessage.emit(message));
      // TODO(mykola): Add subscription group
      server.swarmEvent.on((data) => this.swarmEvent.emit(data));
      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host, server);
      server.commandTrace.on((trace) => this.commandTrace.emit(trace));
      this._topicsJoinedPerSignal.set(host, new ComplexMap(PublicKey.hash));
    }
  }

  async open() {
    if (!this._closed) {
      return;
    }

    await Promise.all([...this._servers.values()].map((server) => server.open()));
    await Promise.all(
      [...this._servers.values()].map((server) =>
        Promise.all([...this._subscribedMessages.values()].map((peerId) => server.subscribeMessages(peerId)))
      )
    );
    this._closed = false;
    this._scheduleReconcile();
  }

  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;

    if (this._reconcileTimeoutId) {
      clearTimeout(this._reconcileTimeoutId);
    }

    await Promise.all(Array.from(this._servers.values()).map((server) => server.close()));
    [...this._topicsJoinedPerSignal.values()].map((value) => value.clear());
  }

  getStatus(): SignalStatus[] {
    return Array.from(this._servers.values()).map((server) => server.getStatus());
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log(`Join ${topic} ${peerId}`);
    assert(!this._topicsJoined.has(topic), `Topic ${topic} is already joined`);
    assert(!this._closed, 'Closed');

    this._topicsJoined.set(topic, peerId);
    this._scheduleReconcile();
  }

  async leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('leaving', { topic, peerId });
    assert(!!this._topicsJoined.has(topic), `Topic ${topic} was not joined`);
    assert(!this._closed, 'Closed');

    this._subscribedMessages.delete(peerId);
    this._topicsJoined.delete(topic);
    this._scheduleReconcile();
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
    assert(!this._closed, 'Closed');

    await Promise.all(
      [...this._servers.values()].map((server: SignalClient) =>
        server.sendMessage({ author, recipient, payload }).catch((err) => log(err))
      )
    );
  }

  async subscribeMessages(peerId: PublicKey) {
    log(`Subscribed for message stream peerId=${peerId}`);
    assert(!this._closed, 'Closed');
    this._subscribedMessages.add(peerId);

    const unsubscribeHandles = await Promise.all(
      [...this._servers.values()].map((signalClient: SignalClient) => signalClient.subscribeMessages(peerId))
    );

    return {
      unsubscribe: async () => {
        await Promise.all(unsubscribeHandles.map((handle) => handle.unsubscribe()));
      }
    };
  }

  private _scheduleReconcile() {
    if (this._closed) {
      return;
    }

    if (!this._reconciling) {
      this._reconciling = true;
      this._reconcileJoinedTopics().then(
        () => {
          this._reconciling = false;
        },
        (err) => {
          this._reconciling = false;
          log.error(`Error while reconciling: ${err}`);
          this._reconcileLater();
        }
      );
    } else {
      this._reconcileLater();
    }
  }

  private _reconcileLater() {
    if (this._closed) {
      return;
    }

    if (!this._reconcileTimeoutId) {
      this._reconcileTimeoutId = setTimeout(async () => this._scheduleReconcile(), 3000);
    }
  }

  @synchronized
  private async _reconcileJoinedTopics() {
    // TODO(mykola): Handle reconnects to SS. Maybe move map of joined topics to signal-client.
    log('Reconciling..');
    for (const [host, server] of this._servers) {
      const actualJoinedTopics = this._topicsJoinedPerSignal.get(host)!;

      // Leave swarms
      for (const [topic, actualPeerId] of actualJoinedTopics) {
        try {
          const desiredPeerId = this._topicsJoined.get(topic);
          if (!desiredPeerId || !desiredPeerId.equals(actualPeerId)) {
            await server.leave({ topic, peerId: actualPeerId });
            actualJoinedTopics.delete(topic);
          }
        } catch (err) {
          log.error(`Error leaving swarm: ${err}`);
          this._scheduleReconcile();
        }
      }

      // Join swarms
      for (const [topic, desiredPeerId] of this._topicsJoined) {
        try {
          const actualPeerId = actualJoinedTopics.get(topic);
          if (!actualPeerId) {
            await server.join({ topic, peerId: desiredPeerId });
            actualJoinedTopics.set(topic, desiredPeerId);
          } else {
            if (!actualPeerId.equals(desiredPeerId)) {
              throw new Error(
                `Joined with peerId different from desired: ${JSON.stringify({
                  actualPeerId,
                  desiredPeerId
                })}`
              );
            }
          }
        } catch (err) {
          log.error(`Error joining swarm: ${err}`);
          this._scheduleReconcile();
        }
      }
    }
    log('Done reconciling..');
    this._reconciling = false;
  }
}
