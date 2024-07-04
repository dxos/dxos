//
// Copyright 2020 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { type SignalStatus } from '../signal-methods';

/**
 * Common signaling context that connects multiple MemorySignalManager instances.
 */
export class MemorySignalManagerContext {
  // Swarm messages.
  readonly swarmEvent = new Event<{
    topic: PublicKey;
    swarmEvent: SwarmEvent;
  }>();

  // Mapping from topic to set of peers.
  readonly swarms = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  // Map of connections for each peer for signaling.
  readonly connections = new ComplexMap<PublicKey, MemorySignalManager>(PublicKey.hash);
}

/**
 * In memory signal manager for testing.
 */
export class MemorySignalManager implements SignalManager {
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

  /**  Will be used to emit SwarmEvents on .open() and .close() */
  private _joinedSwarms = new ComplexSet<{ topic: PublicKey; peerId: PublicKey }>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
  );

  private _ctx!: Context;

  // TODO(dmaretskyi): Replace with callback.
  private readonly _freezeTrigger = new Trigger().wake();

  constructor(private readonly _context: MemorySignalManagerContext) {
    this._ctx = new Context();

    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));
  }

  async open() {
    if (!this._ctx.disposed) {
      return;
    }
    this._ctx = new Context();
    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.join(value)));
  }

  async close() {
    if (this._ctx.disposed) {
      return;
    }
    // save copy of joined swarms.
    const joinedSwarmsCopy = new ComplexSet<{ topic: PublicKey; peerId: PublicKey }>(
      ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
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

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.add({ topic, peerId });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PublicKey.hash));
    }

    this._context.swarms.get(topic)!.add(peerId);
    this._context.swarmEvent.emit({
      topic,
      swarmEvent: {
        peerAvailable: {
          peer: peerId.asUint8Array(),
          since: new Date(),
        },
      },
    });

    // Emitting swarm events for each peer.
    for (const [topic, peerIds] of this._context.swarms) {
      Array.from(peerIds).forEach((peerId) => {
        this.swarmEvent.emit({
          topic,
          swarmEvent: {
            peerAvailable: {
              peer: peerId.asUint8Array(),
              since: new Date(),
            },
          },
        });
      });
    }
  }

  async leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.delete({ topic, peerId });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(PublicKey.hash));
    }

    this._context.swarms.get(topic)!.delete(peerId);

    const swarmEvent: SwarmEvent = {
      peerLeft: {
        peer: peerId.asUint8Array(),
      },
    };

    this._context.swarmEvent.emit({ topic, swarmEvent });
  }

  async sendMessage({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) {
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

  async subscribeMessages(peerId: PublicKey) {
    log('subscribing', { peerId });
    this._context.connections.set(peerId, this);
  }

  async unsubscribeMessages(peerId: PublicKey) {
    log('unsubscribing', { peerId });
    this._context.connections.delete(peerId);
  }

  freeze() {
    this._freezeTrigger.reset();
  }

  unfreeze() {
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
