//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { SwarmEvent } from '../proto/gen/dxos/mesh/signal';
import { SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalApi } from './signal-api';
import { SignalClient } from './signal-client';
import { SignalManager } from './signal-manager';

const log = debug('dxos:network-manager:websocket-signal-manager');

export class SignalManagerImpl implements SignalManager {
  private readonly _servers = new Map<string, SignalClient>();

  /** Topics joined: topic => peerId */
  private readonly _topicsJoined = new ComplexMap<PublicKey, PublicKey>(topic => topic.toHex());
  private readonly _topicsJoinedPerSignal = new Map<string, ComplexMap<PublicKey, PublicKey>>();

  private _reconcileTimeoutId?: NodeJS.Timeout;

  readonly statusChanged = new Event<SignalApi.Status[]>();
  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly swarmEvent = new Event<[topic: PublicKey, swarmEvent: SwarmEvent]>();
  readonly onSignal = new Event<SignalMessage>();

  constructor (
    private readonly _hosts: string[]
  ) {
    log(`Created WebsocketSignalManager with signal servers: ${_hosts}`);
    assert(_hosts.length === 1, 'Only a single signaling server connection is supported');
    for (const host of this._hosts) {
      const server = new SignalClient(
        host,
        async msg => this.onSignal.emit(msg)
      );
      // TODO(mykola): Add subscription group
      server.swarmEvent.on(data => this.swarmEvent.emit(data));
      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));

      this._servers.set(host, server);
      server.commandTrace.on(trace => this.commandTrace.emit(trace));
      this._topicsJoinedPerSignal.set(host, new ComplexMap(x => x.toHex()));
    }
  }

  getStatus (): SignalApi.Status[] {
    return Array.from(this._servers.values()).map(server => server.getStatus());
  }

  join (topic: PublicKey, peerId: PublicKey) {
    log(`Join ${topic} ${peerId}`);
    this._topicsJoined.set(topic, peerId);
    void this._reconcileJoinedTopics();
  }

  leave (topic: PublicKey, peerId: PublicKey) {
    log(`Leave ${topic} ${peerId}`);
    this._topicsJoined.delete(topic);
    void this._reconcileJoinedTopics();
  }

  @synchronized
  private async _reconcileJoinedTopics () {
    log('Reconciling joined topics');
    const promises: Promise<void>[] = [];
    for (const [host, server] of this._servers.entries()) {
      for (const [topic, peerId] of this._topicsJoined.entries()) {
        if (!this._topicsJoinedPerSignal.get(host)!.has(topic)) {
          log(`Join ${topic} as ${peerId} on ${host}`);
          promises.push(server.join(topic, peerId).then(
            () => {
              log(`Joined successfully ${host}`);
              this._topicsJoinedPerSignal.get(host)!.set(topic, peerId);
            },
            err => {
              log(`Join error ${host} ${err.message}`);
              this._topicsJoinedPerSignal.get(host)!.delete(topic);
              this._reconcile();
            }
          ));
        }

        for (const [topic, peerId] of this._topicsJoinedPerSignal.get(host)!.entries()) {
          if (!this._topicsJoined.has(topic)) {
            log(`Leave ${topic} as ${peerId} on ${host}`);
            promises.push(server.leave(topic, peerId).then(
              () => {
                log(`Left successfully ${host}`);
                this._topicsJoinedPerSignal.get(host)!.delete(topic);
              },
              err => {
                log(`Leave error ${host} ${err.message}`);
                this._reconcile();
              }
            ));
          }
        }
      }
    }
    await Promise.all(promises);
  }

  private _reconcile () {
    if (this._reconcileTimeoutId !== undefined) {
      return;
    }
    log('Will reconcile in 3 seconds');
    this._reconcileTimeoutId = setTimeout(async () => {
      this._reconcileTimeoutId = undefined;
      await this._reconcileJoinedTopics();
    }, 3_000);
  }

  // TODO(mykola): rename to message
  async signal (msg: SignalMessage) {
    log(`Signal ${msg.remoteId}`);
    for (const server of this._servers.values()) {
      void server.signal(msg);
      // TODO(marik-d): Error handling.
    }
  }

  async destroy () {
    await Promise.all(Array.from(this._servers.values()).map(server => server.close()));
  }
}
