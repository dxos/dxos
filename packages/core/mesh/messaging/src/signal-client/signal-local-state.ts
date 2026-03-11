//
// Copyright 2024 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import type { Stream } from '@dxos/codec-protobuf/stream';
import { type Context, cancelWithContext } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type Message as SignalMessage,
  type SwarmEvent as SwarmEventProto,
} from '@dxos/protocols/proto/dxos/mesh/signal';
import { ComplexMap, ComplexSet, safeAwaitAll } from '@dxos/util';

import type { Message, SwarmEvent } from '../signal-methods';

import { type SignalRPCClient } from './signal-rpc-client';

export class SignalLocalState {
  /**
   * Swarm events streams. Keys represent actually joined topic and peerId.
   */
  private readonly _swarmStreams = new ComplexMap<{ topic: PublicKey; peerId: PublicKey }, Stream<SwarmEventProto>>(
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
    private readonly _onMessage: (params: Message) => Promise<void>,
    private readonly _onSwarmEvent: (params: SwarmEvent) => Promise<void>,
  ) {}

  async safeCloseStreams(_ctx: Context): Promise<{ failureCount: number }> {
    const streams = ([...this._swarmStreams.values()] as Stream<any>[]).concat([...this.messageStreams.values()]);
    this._swarmStreams.clear();
    this.messageStreams.clear();
    const failureCount = (await safeAwaitAll(streams, (s) => s.close())).length;
    return { failureCount };
  }

  join(ctx: Context, { topic, peerId }: { topic: PublicKey; peerId: PublicKey }): void {
    this._joinedTopics.add({ topic, peerId });
  }

  leave(ctx: Context, { topic, peerId }: { topic: PublicKey; peerId: PublicKey }): void {
    void this._swarmStreams.get({ topic, peerId })?.close();
    this._swarmStreams.delete({ topic, peerId });
    this._joinedTopics.delete({ topic, peerId });
  }

  subscribeMessages(ctx: Context, peerId: PublicKey): void {
    this._subscribedMessages.add({ peerId });
  }

  unsubscribeMessages(ctx: Context, peerId: PublicKey): void {
    log('unsubscribing from messages', { peerId });
    this._subscribedMessages.delete({ peerId });
    void this.messageStreams.get(peerId)?.close();
    this.messageStreams.delete(peerId);
  }

  public async reconcile(ctx: Context, client: SignalRPCClient): Promise<void> {
    await this._reconcileSwarmSubscriptions(ctx, client);
    await this._reconcileMessageSubscriptions(ctx, client);
    this.reconciled.emit();
  }

  private async _reconcileSwarmSubscriptions(ctx: Context, client: SignalRPCClient): Promise<void> {
    for (const { topic, peerId } of this._swarmStreams.keys()) {
      if (this._joinedTopics.has({ topic, peerId })) {
        continue;
      }

      void this._swarmStreams.get({ topic, peerId })?.close();
      this._swarmStreams.delete({ topic, peerId });
    }

    for (const { topic, peerId } of this._joinedTopics.values()) {
      if (this._swarmStreams.has({ topic, peerId })) {
        continue;
      }

      const swarmStream = await asyncTimeout(cancelWithContext(ctx, client.join(ctx, { topic, peerId })), 5_000);
      swarmStream.subscribe(async (swarmEvent: SwarmEventProto) => {
        if (this._joinedTopics.has({ topic, peerId })) {
          log('swarm event', { swarmEvent });
          const event: SwarmEvent = swarmEvent.peerAvailable
            ? {
                topic,
                peerAvailable: {
                  ...swarmEvent.peerAvailable,
                  peer: { peerKey: PublicKey.from(swarmEvent.peerAvailable.peer).toHex() },
                },
              }
            : {
                topic,
                peerLeft: {
                  ...swarmEvent.peerLeft,
                  peer: { peerKey: PublicKey.from(swarmEvent.peerLeft!.peer).toHex() },
                },
              };
          await this._onSwarmEvent(event);
        }
      });

      this._swarmStreams.set({ topic, peerId }, swarmStream);
    }
  }

  private async _reconcileMessageSubscriptions(ctx: Context, client: SignalRPCClient): Promise<void> {
    for (const peerId of this.messageStreams.keys()) {
      if (this._subscribedMessages.has({ peerId })) {
        continue;
      }

      void this.messageStreams.get(peerId)?.close();
      this.messageStreams.delete(peerId);
    }

    for (const { peerId } of this._subscribedMessages.values()) {
      if (this.messageStreams.has(peerId)) {
        continue;
      }

      const messageStream = await asyncTimeout(cancelWithContext(ctx, client.receiveMessages(ctx, peerId)), 5_000);
      messageStream.subscribe(async (signalMessage: SignalMessage) => {
        if (this._subscribedMessages.has({ peerId })) {
          const message: Message = {
            author: { peerKey: PublicKey.from(signalMessage.author).toHex() },
            recipient: { peerKey: PublicKey.from(signalMessage.recipient).toHex() },
            payload: signalMessage.payload,
          };
          await this._onMessage(message);
        }
      });

      this.messageStreams.set(peerId, messageStream);
    }
  }
}
