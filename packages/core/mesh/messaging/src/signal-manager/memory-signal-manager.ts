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

import {
  type Message,
  type PeerInfo,
  PeerInfoHash,
  type SignalStatus,
  type SubscribeMessagesParams,
  type SwarmEvent,
  type UnsubscribeCallback,
} from '../signal-methods';
import { type SignalManager } from './signal-manager';

/**
 * A single message subscription registered on a {@link MemorySignalManager} (DX-1125). Point-to-point
 * delivery matches `peerKey`; broadcast delivery matches any intersection with `tags`.
 */
type MessageSubscription = {
  peerKey: string;
  tags: Set<string>;
  onMessage: (message: Message) => void;
};

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

  /**
   * Active message subscriptions on this manager. Routing is encapsulated here (DX-1125): a delivered
   * message is dispatched to every subscription it matches.
   */
  private readonly _subscriptions = new Set<MessageSubscription>();

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

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.join(this._ctx, value)));
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

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.leave(this._ctx, value)));

    // assign joined swarms back because .leave() deletes it.
    this._joinedSwarms = joinedSwarmsCopy;

    await this._ctx.dispose();
  }

  getStatus(): SignalStatus[] {
    return [];
  }

  async join(_ctx: Context, { topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
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

  async leave(_ctx: Context, { topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
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

  async query(_ctx: Context, request: QueryRequest): Promise<SwarmResponse> {
    throw new Error('Not implemented');
  }

  async sendMessage(_ctx: Context, message: Message): Promise<void> {
    invariant(!this._ctx.disposed, 'Closed');
    const { author, recipient, tags, payload } = message;
    // Exactly one of point-to-point (`recipient`) or broadcast (`tags`) delivery (DX-1125).
    invariant((recipient == null) !== !tags?.length, 'Exactly one of `recipient` or `tags` must be set');

    await this._freezeTrigger.wait();

    if (recipient != null) {
      log('send message', { author, recipient, ...dec(payload) });
      const remote = this._context.connections.get(recipient);
      if (!remote) {
        log.warn('recipient is not subscribed for messages', { author, recipient });
        return;
      }
      remote._deliver(message);
    } else {
      // Broadcast: fan out to every subscriber in the shared context whose tags intersect.
      log('broadcast message', { author, tags, ...dec(payload) });
      for (const manager of new Set(this._context.connections.values())) {
        manager._deliver(message);
      }
    }
  }

  async subscribeMessages({ peer, tags = [], onMessage }: SubscribeMessagesParams): Promise<UnsubscribeCallback> {
    invariant(!this._ctx.disposed, 'Closed');
    log('subscribing', { peer, tags });
    const subscription: MessageSubscription = { peerKey: peer.peerKey, tags: new Set(tags), onMessage };
    this._subscriptions.add(subscription);
    this._context.connections.set(peer, this);

    return async () => {
      log('unsubscribing', { peer, tags });
      this._subscriptions.delete(subscription);
      // Drop the shared-context connection entry only once no subscription for this peer remains.
      if (![...this._subscriptions].some((sub) => sub.peerKey === peer.peerKey)) {
        this._context.connections.delete(peer);
      }
    };
  }

  freeze(): void {
    this._freezeTrigger.reset();
  }

  unfreeze(): void {
    this._freezeTrigger.wake();
  }

  /**
   * Route a delivered message to this manager's matching subscriptions once it is unfrozen and open.
   */
  private _deliver(message: Message): void {
    if (this._ctx.disposed) {
      log.warn('recipient is disposed', { message });
      return;
    }

    this._freezeTrigger
      .wait()
      .then(() => {
        if (this._ctx.disposed) {
          log.warn('recipient is disposed', { message });
          return;
        }

        log('receive message', { author: message.author, recipient: message.recipient, ...dec(message.payload) });
        for (const subscription of this._subscriptions) {
          if (message.recipient != null) {
            if (subscription.peerKey === message.recipient.peerKey) {
              subscription.onMessage(message);
            }
          } else if (message.tags?.some((tag) => subscription.tags.has(tag))) {
            subscription.onMessage(message);
          }
        }
      })
      .catch((err) => {
        log.error('error while waiting for freeze', { err });
      });
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
