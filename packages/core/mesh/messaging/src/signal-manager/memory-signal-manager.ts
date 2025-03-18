//
// Copyright 2020 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { ComplexMap, ComplexSet } from '@dxos/util';

import {
  type JoinRequest,
  type SignalManager,
  type PeerInfo,
  type Message,
  PeerInfoHash,
  type LeaveRequest,
  type QueryRequest,
} from './signal-manager';

/**
 * Common signaling context that connects multiple MemorySignalManager instances.
 */
export class MemorySignalManagerContext {
  // Swarm messages.
  readonly swarmState = new Event<SwarmResponse>();

  // Mapping from swarmKey to set of peers.
  readonly swarms = new Map<string, ComplexSet<PeerInfo>>();

  // Map of connections for each peer for signaling.
  readonly connections = new ComplexMap<PeerInfo, MemorySignalManager>(PeerInfoHash);
}

/**
 * In memory signal manager for testing.
 */
export class MemorySignalManager extends Resource implements SignalManager {
  readonly swarmState = new Event<SwarmResponse>();
  readonly onMessage = new Event<Message>();

  /**  Will be used to emit swarmState on .open() and .close() */
  private _joinedSwarms = new ComplexSet<{ swarmKey: string; peer: PeerInfo }>(
    ({ swarmKey, peer }) => swarmKey + peer.peerKey,
  );

  // TODO(dmaretskyi): Replace with callback.
  private readonly _freezeTrigger = new Trigger().wake();
  private readonly _context: MemorySignalManagerContext;
  private _peerInfo?: PeerInfo = undefined;

  constructor(context: MemorySignalManagerContext, peerInfo?: PeerInfo) {
    super();
    this._context = context;
    this._peerInfo = peerInfo;
  }

  protected override async _open() {
    this._ctx.onDispose(this._context.swarmState.on((data) => this.swarmState.emit(data)));
    await Promise.all([...this._joinedSwarms.values()].map((value) => this.join(value)));
    this._maybeSaveConnection();
  }

  protected override async _close() {
    // save copy of joined swarms.
    const joinedSwarmsCopy = new ComplexSet<{ swarmKey: string; peer: PeerInfo }>(
      ({ swarmKey, peer }) => swarmKey + peer.peerKey,
      [...this._joinedSwarms.values()],
    );
    await Promise.all([...this._joinedSwarms.values()].map((value) => this.leave(value)));
    // assign joined swarms back because .leave() deletes it.
    this._joinedSwarms = joinedSwarmsCopy;

    await this._ctx.dispose();
  }

  async join({ swarmKey, peer }: JoinRequest) {
    this._maybeSaveConnection(peer);
    invariant(!this._ctx.disposed, 'Closed');
    this._joinedSwarms.add({ swarmKey, peer });
    if (!this._context.swarms.has(swarmKey)) {
      this._context.swarms.set(swarmKey, new ComplexSet(PeerInfoHash));
    }

    const swarm = this._context.swarms.get(swarmKey)!;
    swarm.add(peer);
    this._context.swarmState.emit({ swarmKey, peers: Array.from(swarm.values()) });
    this.swarmState.emit({ swarmKey, peers: Array.from(swarm.values()) });
  }

  async leave({ swarmKey, peer }: LeaveRequest) {
    invariant(!this._ctx.disposed, 'Closed');
    this._joinedSwarms.delete({ swarmKey, peer });
    if (!this._context.swarms.has(swarmKey)) {
      this._context.swarms.set(swarmKey, new ComplexSet(PeerInfoHash));
    }

    const swarm = this._context.swarms.get(swarmKey)!;
    swarm.delete(peer);
    this._context.swarmState.emit({ swarmKey, peers: Array.from(swarm.values()) });
  }

  async query({ swarmKey }: QueryRequest): Promise<void> {
    throw new Error('not implemented');
  }

  async sendMessage({ author, recipient, payload }: Message) {
    this._maybeSaveConnection(author);
    log('send message', { author, recipient, ...dec(payload) });
    invariant(recipient);
    invariant(!this._ctx.disposed, 'Closed');
    await this._freezeTrigger.wait();
    const remote = this._context.connections.get(recipient);
    if (!remote) {
      log.warn('recipient is not subscribed for messages', { author, recipient });
      return;
    }
    if (remote._ctx.disposed) {
      log.warn('recipient is disposed', { author, recipient });
      return;
    }

    remote._freezeTrigger
      .wait()
      .then(() => {
        if (remote._ctx.disposed) {
          log.warn('recipient is disposed', { author, recipient });
          return;
        }

        log('receive message', { author, recipient, ...dec(payload) });

        remote.onMessage.emit({ author, recipient, payload });
      })
      .catch((err) => {
        log.error('error while waiting for freeze', { err });
      });
  }

  /**
   * Freezes the signal manager.
   * Mocks the network delay.
   */
  freeze() {
    this._freezeTrigger.reset();
  }

  /**
   * Unfreezes the signal manager.
   */
  unfreeze() {
    this._freezeTrigger.wake();
  }

  /**
   * Saves the connection to the global context.
   * This is needed to make signal manager discoverable by other signal managers.
   */
  private _maybeSaveConnection(peerInfo?: PeerInfo) {
    this._peerInfo ??= peerInfo;
    if (!this._peerInfo) {
      return;
    }
    const existing = this._context.connections.get(this._peerInfo);
    if (existing) {
      return;
    }

    const currentInfo = this._peerInfo;
    this._context.connections.set(currentInfo, this);
    this._ctx.onDispose(() => this._context.connections.delete(currentInfo));
  }
}

const dec = (payload: Any) => {
  if (!payload.type_url.endsWith('ReliablePayload')) {
    return {};
  }

  const relPayload = schema.getCodecForType('dxos.mesh.messaging.ReliablePayload').decode(payload.value);

  if (typeof relPayload?.payload?.data === 'object') {
    return { payload: Object.keys(relPayload?.payload?.data)[0], sessionId: relPayload?.payload?.sessionId };
  }

  return {};
};
