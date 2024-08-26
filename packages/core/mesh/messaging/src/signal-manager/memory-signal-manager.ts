//
// Copyright 2020 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { type PeerInfo, type Message, type SignalStatus, type SwarmEvent } from '../signal-methods';

/**
 * Common signaling context that connects multiple MemorySignalManager instances.
 */
export class MemorySignalManagerContext {
  // Swarm messages.
  readonly swarmEvent = new Event<SwarmEvent>();

  // Mapping from topic to set of peers.
  readonly swarms = new ComplexMap<PublicKey, ComplexSet<PeerInfo>>(PublicKey.hash);

  // Map of connections for each peer for signaling.
  readonly connections = new Map<string, MemorySignalManager>();
}

/**
 * In memory signal manager for testing.
 */
export class MemorySignalManager extends Resource implements SignalManager {
  readonly statusChanged = new Event<SignalStatus[]>();
  readonly swarmEvent = new Event<SwarmEvent>();

  readonly onMessage = new Event<Message>();

  /**  Will be used to emit SwarmEvents on .open() and .close() */
  private _joinedSwarms = new ComplexSet<{ topic: PublicKey; peer: PeerInfo }>(
    ({ topic, peer }) => topic.toHex() + peer.peerKey,
  );

  // TODO(dmaretskyi): Replace with callback.
  private readonly _freezeTrigger = new Trigger().wake();

  constructor(private readonly _context: MemorySignalManagerContext) {
    super();

    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));
  }

  protected override async _open() {
    this._ctx.onDispose(this._context.swarmEvent.on((data) => this.swarmEvent.emit(data)));

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.join(value)));
  }

  protected override async _close() {
    // save copy of joined swarms.
    const joinedSwarmsCopy = new ComplexSet<{ topic: PublicKey; peer: PeerInfo }>(
      ({ topic, peer }) => topic.toHex() + peer.peerKey,
      [...this._joinedSwarms.values()],
    );

    await Promise.all([...this._joinedSwarms.values()].map((value) => this.leave(value)));

    // assign joined swarms back because .leave() deletes it.
    this._joinedSwarms = joinedSwarmsCopy;
  }

  getStatus(): SignalStatus[] {
    return [];
  }

  async join({ topic, peer }: { topic: PublicKey; peer: PeerInfo }) {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.add({ topic, peer });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(({ peerKey }) => peerKey));
    }

    this._context.swarms.get(topic)!.add(peer);
    this._context.swarmEvent.emit({ topic, peerAvailable: { peer, since: new Date() } });

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

  async leave({ topic, peer }: { topic: PublicKey; peer: PeerInfo }) {
    invariant(!this._ctx.disposed, 'Closed');

    this._joinedSwarms.delete({ topic, peer });

    if (!this._context.swarms.has(topic)) {
      this._context.swarms.set(topic, new ComplexSet(({ peerKey }) => peerKey));
    }

    this._context.swarms.get(topic)!.delete(peer);

    this._context.swarmEvent.emit({ topic, peerLeft: { peer } });
  }

  async sendMessage({ author, recipient, payload }: Message) {
    log('send message', { author, recipient, ...dec(payload) });

    invariant(recipient);
    invariant(!this._ctx.disposed, 'Closed');

    await this._freezeTrigger.wait();

    const remote = this._context.connections.get(recipient.peerKey!);
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

  async subscribeMessages(peer: PeerInfo) {
    log('subscribing', { peer });
    invariant(peer.peerKey, 'Peer key is required');
    this._context.connections.set(peer.peerKey!, this);
  }

  async unsubscribeMessages(peer: PeerInfo) {
    log('unsubscribing', { peer });
    invariant(peer.peerKey, 'Peer key is required');
    this._context.connections.delete(peer.peerKey);
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
