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

const log = debug('dxos:network-manager:signal-manager-impl');

export class SignalManagerImpl implements SignalManager {
  private readonly _servers = new Map<string, SignalClient>();

  /** Topics joined: topic => peerId */
  private readonly _topicsJoined = new ComplexMap<PublicKey, PublicKey>(topic => topic.toHex());
  /** host => topic => peerId */
  private readonly _topicsJoinedPerSignal = new Map<string, ComplexMap<PublicKey, PublicKey>>();

  private _reconciling?: boolean = false;
  private _reconcileTimeoutId?: NodeJS.Timeout;
  private _destroyed = false;

  readonly statusChanged = new Event<SignalApi.Status[]>();
  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly swarmEvent = new Event<[topic: PublicKey, swarmEvent: SwarmEvent]>();
  readonly onMessage = new Event<SignalMessage>();

  constructor (
    private readonly _hosts: string[]
  ) {
    log(`Created WebsocketSignalManager with signal servers: ${_hosts}`);
    assert(_hosts.length === 1, 'Only a single signaling server connection is supported');
    for (const host of this._hosts) {
      const server = new SignalClient(
        host,
        async msg => this.onMessage.emit(msg)
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
    assert(!this._topicsJoined.has(topic), `Topic ${topic} is already joined`);
    log(`Join ${topic} ${peerId}`);
    this._topicsJoined.set(topic, peerId);
    this._scheduleReconcile();
  }

  leave (topic: PublicKey, peerId: PublicKey) {
    assert(!!this._topicsJoined.has(topic), `Topic ${topic} was not joined`);
    log(`Leave ${topic} ${peerId}`);
    this._topicsJoined.delete(topic);
    this._scheduleReconcile();
  }

  private _scheduleReconcile () {
    if (this._destroyed) {
      return;
    }

    if (!this._reconciling) {
      this._reconciling = true;
      this._reconcileJoinedTopics().then(
        () => {
          this._reconciling = false;
        },
        err => {
          this._reconciling = false;
          log(`Error while reconciling: ${err}`);
          this._reconcileLater();
        }
      );
    } else {
      this._reconcileLater();
    }
  }

  private _reconcileLater () {
    if (this._destroyed) {
      return;
    }

    if (!this._reconcileTimeoutId) {
      this._reconcileTimeoutId = setTimeout(async () => this._scheduleReconcile(), 3000);
    }
  }

  @synchronized
  private async _reconcileJoinedTopics () {
    // TODO(mykola): Handle reconnects to SS. Maybe move map of joined topics to signal-client.
    log('Reconciling..');
    for (const [host, server] of this._servers) {
      const actualJoinedTopics = this._topicsJoinedPerSignal.get(host)!;

      // Leave swarms
      for (const [topic, actualPeerId] of actualJoinedTopics) {
        try {
          const desiredPeerId = this._topicsJoined.get(topic);
          if (!desiredPeerId || !desiredPeerId.equals(actualPeerId)) {
            await server.leave(topic, actualPeerId);
            actualJoinedTopics.delete(topic);
          }
        } catch (err) {
          log(`Error leaving swarm: ${err}`);
          this._scheduleReconcile();
        }
      }

      // Join swarms
      for (const [topic, desiredPeerId] of this._topicsJoined) {
        try {
          const actualPeerId = actualJoinedTopics.get(topic);
          if (!actualPeerId) {
            await server.join(topic, desiredPeerId);
            actualJoinedTopics.set(topic, desiredPeerId);
          } else {
            if (!actualPeerId.equals(desiredPeerId)) {
              throw new Error(`Joined with peerId different from desired: ${JSON.stringify({ actualPeerId, desiredPeerId })}`);
            }
          }
        } catch (err) {
          log(`Error joining swarm: ${err}`);
          this._scheduleReconcile();
        }
      }
    }
    log('Done reconciling..');
    this._reconciling = false;
  }

  async message (msg: SignalMessage) {
    log(`Signal ${msg.remoteId}`);
    for (const server of this._servers.values()) {
      server.signal(msg).catch(err => {
        log(`Error signaling: ${err}`);
      });
    }
  }

  async destroy () {
    this._destroyed = true;
    if (this._reconcileTimeoutId) {
      clearTimeout(this._reconcileTimeoutId);
    }
    await Promise.all(Array.from(this._servers.values()).map(server => server.close()));
  }
}
