//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ComplexMap } from '@dxos/util';

import { SignalManager } from './interface';
import { SignalApi } from './signal-api';

const log = debug('dxos:network-manager:websocket-signal-manager');

export class WebsocketSignalManager implements SignalManager {
  private readonly _servers = new Map<string, SignalApi>();

  /** Topics joined: topic => peerId */
  private readonly _topicsJoined = new ComplexMap<PublicKey, PublicKey>(x => x.toHex());

  private readonly _topicsJoinedPerSignal = new Map<string, ComplexMap<PublicKey, PublicKey>>();

  private _reconcileTimeoutId?: NodeJS.Timeout;

  readonly statusChanged = new Event<SignalApi.Status[]>();

  readonly commandTrace = new Event<SignalApi.CommandTrace>();

  constructor (
    private readonly _hosts: string[],
    private readonly _onOffer: (message: SignalApi.SignalMessage) => Promise<SignalApi.Answer>
  ) {
    log(`Created WebsocketSignalManager with signal servers: ${_hosts}`);
    assert(_hosts.length === 1, 'Only a single signaling server connection is supported');
    for (const host of this._hosts) {
      const server = new SignalApi(
        host,
        async (msg) => this._onOffer(msg),
        async msg => {
          this.onSignal.emit(msg);
        }
      );
      this._servers.set(host, server);
      server.statusChanged.on(() => this.statusChanged.emit(this.getStatus()));
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
    this._reconcileJoinedTopics();
  }

  leave (topic: PublicKey, peerId: PublicKey) {
    log(`Leave ${topic} ${peerId}`);
    this._topicsJoined.delete(topic);
    this._reconcileJoinedTopics();
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
            peers => {
              log(`Joined successfully ${host}`);
              this._topicsJoinedPerSignal.get(host)!.set(topic, peerId);

              log(`Peer candidates changed ${topic} ${peers}`);
              // TODO(marik-d): Deduplicate peers.
              this.peerCandidatesChanged.emit([topic, peers]);
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
    this._reconcileTimeoutId = setTimeout(() => {
      this._reconcileTimeoutId = undefined;
      this._reconcileJoinedTopics();
    }, 3_000);
  }

  lookup (topic: PublicKey) {
    log(`Lookup ${topic}`);
    for (const server of this._servers.values()) {
      server.lookup(topic).then(
        peers => {
          log(`Peer candidates changed ${topic} ${peers}`);
          // TODO(marik-d): Deduplicate peers.
          this.peerCandidatesChanged.emit([topic, peers]);
        },
        () => {
          // Error will already be reported in devtools. No need to do anything here.
        }
      );
    }
  }

  offer (msg: SignalApi.SignalMessage) {
    log(`Offer ${msg.remoteId}`);
    // TODO(marik-d): Broadcast to all signal servers.
    return Array.from(this._servers.values())[0].offer(msg);
  }

  signal (msg: SignalApi.SignalMessage) {
    log(`Signal ${msg.remoteId}`);
    for (const server of this._servers.values()) {
      server.signal(msg);
      // TODO(marik-d): Error handling.
    }
  }

  peerCandidatesChanged = new Event<[topic: PublicKey, candidates: PublicKey[]]>()

  onSignal = new Event<SignalApi.SignalMessage>();
}
