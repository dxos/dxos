//
// Copyright 2024 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import type { Any, Stream } from '@dxos/codec-protobuf';
import { cancelWithContext, type Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message as SignalMessage, type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet, safeAwaitAll } from '@dxos/util';

import { type SignalRPCClient } from './signal-rpc-client';
import type { Message } from '../signal-methods';

export class SignalLocalState {
  /**
   * Swarm events streams. Keys represent actually joined topic and peerId.
   */
  private readonly _swarmStreams = new ComplexMap<{ topic: PublicKey; peerId: PublicKey }, Stream<SwarmEvent>>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
  );

  /**
   * Represent desired joined topic and peerId.
   */
  private readonly _joinedTopics = new ComplexSet<{ topic: PublicKey; peerId: PublicKey }>(
    ({ topic, peerId }) => topic.toHex() + peerId.toHex(),
  );

  /**
   * Represent desired message subscriptions.
   */
  private readonly _subscribedMessages = new ComplexSet<{ peerId: PublicKey }>(({ peerId }) => peerId.toHex());

  /**
   * Message streams. Keys represents actually subscribed peers.
   * @internal
   */
  readonly messageStreams = new ComplexMap<PublicKey, Stream<SignalMessage>>((key) => key.toHex());

  /**
   * Event to use in tests to wait till subscription is successfully established.
   * @internal
   */
  readonly reconciled = new Event();

  constructor(
    private readonly _onMessage: (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>,
    private readonly _onSwarmEvent: (params: { topic: PublicKey; swarmEvent: SwarmEvent }) => Promise<void>,
  ) {}

  async safeCloseStreams(): Promise<{ failureCount: number }> {
    const streams = ([...this._swarmStreams.values()] as Stream<any>[]).concat([...this.messageStreams.values()]);
    this._swarmStreams.clear();
    this.messageStreams.clear();
    const failureCount = (await safeAwaitAll(streams, (s) => s.close())).length;
    return { failureCount };
  }

  join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    this._joinedTopics.add({ topic, peerId });
  }

  leave({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    void this._swarmStreams.get({ topic, peerId })?.close();
    this._swarmStreams.delete({ topic, peerId });
    this._joinedTopics.delete({ topic, peerId });
  }

  subscribeMessages(peerId: PublicKey) {
    this._subscribedMessages.add({ peerId });
  }

  unsubscribeMessages(peerId: PublicKey) {
    log('unsubscribing from messages', { peerId });
    this._subscribedMessages.delete({ peerId });
    void this.messageStreams.get(peerId)?.close();
    this.messageStreams.delete(peerId);
  }

  public async reconcile(ctx: Context, client: SignalRPCClient) {
    await this._reconcileSwarmSubscriptions(ctx, client);
    await this._reconcileMessageSubscriptions(ctx, client);
    this.reconciled.emit();
  }

  private async _reconcileSwarmSubscriptions(ctx: Context, client: SignalRPCClient): Promise<void> {
    // Unsubscribe from topics that are no longer needed.
    for (const { topic, peerId } of this._swarmStreams.keys()) {
      // Join desired topics.
      if (this._joinedTopics.has({ topic, peerId })) {
        continue;
      }

      void this._swarmStreams.get({ topic, peerId })?.close();
      this._swarmStreams.delete({ topic, peerId });
    }

    // Subscribe to topics that are needed.
    for (const { topic, peerId } of this._joinedTopics.values()) {
      // Join desired topics.
      if (this._swarmStreams.has({ topic, peerId })) {
        continue;
      }

      const swarmStream = await asyncTimeout(cancelWithContext(ctx, client.join({ topic, peerId })), 5_000);
      // Subscribing to swarm events.
      // TODO(mykola): What happens when the swarm stream is closed? Maybe send leave event for each peer?
      swarmStream.subscribe(async (swarmEvent: SwarmEvent) => {
        if (this._joinedTopics.has({ topic, peerId })) {
          log('swarm event', { swarmEvent });
          await this._onSwarmEvent({ topic, swarmEvent });
        }
      });

      // Saving swarm stream.
      this._swarmStreams.set({ topic, peerId }, swarmStream);
    }
  }

  private async _reconcileMessageSubscriptions(ctx: Context, client: SignalRPCClient): Promise<void> {
    // Unsubscribe from messages that are no longer needed.
    for (const peerId of this.messageStreams.keys()) {
      // Join desired topics.
      if (this._subscribedMessages.has({ peerId })) {
        continue;
      }

      void this.messageStreams.get(peerId)?.close();
      this.messageStreams.delete(peerId);
    }

    // Subscribe to messages that are needed.
    for (const { peerId } of this._subscribedMessages.values()) {
      if (this.messageStreams.has(peerId)) {
        continue;
      }

      const messageStream = await asyncTimeout(cancelWithContext(ctx, client.receiveMessages(peerId)), 5_000);
      messageStream.subscribe(async (signalMessage: SignalMessage) => {
        if (this._subscribedMessages.has({ peerId })) {
          const message: Message = {
            author: PublicKey.from(signalMessage.author),
            recipient: PublicKey.from(signalMessage.recipient),
            payload: signalMessage.payload,
          };
          await this._onMessage(message);
        }
      });

      // Saving message stream.
      this.messageStreams.set(peerId, messageStream);
    }
  }
}
