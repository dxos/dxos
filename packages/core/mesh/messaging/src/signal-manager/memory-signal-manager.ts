//
// Copyright 2020 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type QueryRequest } from '@dxos/protocols/proto/dxos/edge/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { type SwarmEvent, type PeerInfo, type SignalStatus, type Message, PeerInfoHash } from '../signal-methods';

/**
 * Common signaling context that connects multiple MemorySignalManager instances.
 */
export class MemorySignalManagerContext {
  // Swarm messages.
  readonly swarmEvent = new Event<SwarmEvent>();

  // Mapping from topic to set of peers.
  readonly swarms = new ComplexMap<PublicKey, ComplexSet<PeerInfo>>(PublicKey.hash);

  // Map of connections for each peer for signaling.
  readonly connections = new ComplexMap<PeerInfo, MemorySignalManager>(PeerInfoHash);
}

/**
 * In memory signal manager for testing.
 */
export class MemorySignalManager implements SignalManager {
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly swarmEvent = new Event<SwarmEvent>();

  readonly onMessage = new Event<Message>();

  /**  Will be used to emit SwarmEvents on .open() and .close() */
  private _joinedSwarms = new ComplexSet<{ topic: PublicKey; peer: PeerInfo }>(
    ({ topic, peer }) => topic.toHex() + peer.peerKey,
  );

  private _ctx!: Context;

  // TODO(dmaretskyi): Replace with callback.
  private readonly _freezeTrigger = new Trigger().wake();

  constructor(private readonly _context: MemorySignalManagerContext) {
    this._ctx = new Context();

    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));
  }

  async open(): Promise<void> {
    if (!this._ctx.disposed) {
      return;
    }
    this._ctx = new Context();
    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.join(value)));
  }

  async close(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    // save copy of joined swarms.
    const joinedSwarmsCopy = new ComplexSet<{ topic: PublicKey; peer: PeerInfo }>(
      ({ topic, peer }) => topic.toHex() + peer.peerKey,
      [...this._joinedSwarms.values()],
    );

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.leave(value)));

    // assign joined swarms back because .leave() deletes it.
    this._joinedSwarms = joinedSwarmsCopy;

    await this._ctx.dispose();
  }

  getStatus(): SignalStatus[] {
    return [];
  }

  async join({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.add({ topic, peer });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PeerInfoHash));
    }

    this._context.swarms.get(topic)!.add(peer);
    this._context.swarmEvent.emit({
      topic,
      peerAvailable: {
        peer,
        since: new Date(),
      },
    });

    // Emitting swarm events for each peer.
    for (const [topic, peers] of this._context.swarms) {
      Array.from(peers).forEach((peer) => {
        this.swarmEvent.emit({
          topic,
          peerAvailable: {
            peer,
            since: new Date(),
          },
        });
      });
    }
  }

  async leave({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.delete({ topic, peer });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PeerInfoHash));
    }

    this._context.swarms.get(topic)!.delete(peer);

    const swarmEvent: SwarmEvent = {
      topic,
      peerLeft: {
        peer,
      },
    };

    this._context.swarmEvent.emit(swarmEvent);
  }

  async query(request: QueryRequest): Promise<SwarmResponse> {
    throw new Error('Not implemented');
  }

  async sendMessage({
    author,
    recipient,
    payload,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    payload: Any;
  }): Promise<void> {
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

  async subscribeMessages(peerInfo: PeerInfo): Promise<void> {
    log('subscribing', { peerInfo });
    this._context.connections.set(peerInfo, this);
  }

  async unsubscribeMessages(peerInfo: PeerInfo): Promise<void> {
    log('unsubscribing', { peerInfo });
    this._context.connections.delete(peerInfo);
  }

  freeze(): void {
    this._freezeTrigger.reset();
  }

  unfreeze(): void {
    this._freezeTrigger.wake();
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
