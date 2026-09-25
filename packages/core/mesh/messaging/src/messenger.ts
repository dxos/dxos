//
// Copyright 2022 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { AnySchema } from '@bufbuild/protobuf/wkt';

import { TimeoutError, scheduleExponentialBackoffTaskInterval, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TimeoutError as ProtocolTimeoutError } from '@dxos/protocols';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import {
  AcknowledgementSchema,
  type ReliablePayload,
  ReliablePayloadSchema,
} from '@dxos/protocols/buf/dxos/mesh/messaging_pb';
import { type AnyEnvelope } from '@dxos/protocols/service-contract';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { MessengerMonitor } from './messenger-monitor.ts';
import { type SignalManager } from './signal-manager/index.ts';
import { type Message, type PeerInfo } from './signal-methods.ts';
import { MESSAGE_TIMEOUT } from './timeouts.ts';

export type OnMessage = (params: Message) => Promise<void>;

export interface MessengerOptions {
  signalManager: SignalManager;
  retryDelay?: number;
}

const RECEIVED_MESSAGES_GC_INTERVAL = 120_000;

/**
 * Reliable messenger that works trough signal network.
 */
export class Messenger {
  private readonly _monitor = new MessengerMonitor();
  private readonly _signalManager: SignalManager;
  // { peerId, payloadType } => listeners set
  private readonly _listeners = new ComplexMap<{ peerId: string; payloadType: string }, Set<OnMessage>>(
    ({ peerId, payloadType }) => peerId + payloadType,
  );

  // peerId => listeners set
  private readonly _defaultListeners = new Map<string, Set<OnMessage>>();

  private readonly _onAckCallbacks = new ComplexMap<PublicKey, () => void>(PublicKey.hash);

  private readonly _receivedMessages = new ComplexSet<PublicKey>(PublicKey.hash);

  /**
   * Keys scheduled to be cleared from _receivedMessages on the next iteration.
   */
  private readonly _toClear = new ComplexSet<PublicKey>(PublicKey.hash);

  private _ctx!: Context;
  private _closed = true;
  private readonly _retryDelay: number;

  constructor({ signalManager, retryDelay = 1000 }: MessengerOptions) {
    this._signalManager = signalManager;
    this._retryDelay = retryDelay;

    this.open();
  }

  open(): void {
    if (!this._closed) {
      return;
    }
    log('opening messenger');
    this._ctx = new Context({
      onError: (err) => log.catch(err),
    });

    // Clear the map periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this._performGc();
      },
      RECEIVED_MESSAGES_GC_INTERVAL,
    );

    this._closed = false;
    log('opened messenger');
  }

  async close(): Promise<void> {
    if (this._closed) {
      return;
    }
    this._closed = true;
    // Disposing the context tears down every still-active subscription — each `listen` registers its
    // transport unsubscribe via `onDispose`, and a handle unsubscribed manually has already cleared
    // its registration. The offline/online cycle keeps the messenger open (only signaling toggles),
    // so subscriptions are torn down only on a real close.
    await this._ctx.dispose();
  }

  async sendMessage(ctx: Context, message: Message): Promise<void> {
    invariant(!this._closed, 'Closed');
    const { author, recipient, payload } = message;
    // Messenger provides reliable point-to-point delivery; broadcasts are not routed here.
    invariant(recipient, 'Recipient is required');
    invariant(author, 'Author is required');
    const messageContext = this._ctx.derive();

    const messageId = PublicKey.random();
    const reliablePayload = create(ReliablePayloadSchema, { messageId: fromPublicKey(messageId), payload });
    invariant(!this._onAckCallbacks.has(messageId));
    log('send message', { messageId, author, recipient });

    let messageReceived: () => void;
    let timeoutHit: (err: Error) => void;
    let sendAttempts = 0;

    const promise = new Promise<void>((resolve, reject) => {
      messageReceived = resolve;
      timeoutHit = reject;
    });

    // Setting retry interval if signal was not acknowledged.
    scheduleExponentialBackoffTaskInterval(
      messageContext,
      async () => {
        log('retrying message', { messageId });
        sendAttempts++;
        await this._encodeAndSend(ctx, { author, recipient, reliablePayload }).catch((err) =>
          log('failed to send message', { err }),
        );
      },
      this._retryDelay,
    );

    scheduleTask(
      messageContext,
      () => {
        log('message not delivered', { messageId });
        this._onAckCallbacks.delete(messageId);
        timeoutHit(
          new ProtocolTimeoutError({
            message: 'signaling message not delivered',
            cause: new TimeoutError(MESSAGE_TIMEOUT, 'Message not delivered'),
          }),
        );
        void messageContext.dispose();
        this._monitor.recordReliableMessage({ sendAttempts, sent: false });
      },
      MESSAGE_TIMEOUT,
    );

    this._onAckCallbacks.set(messageId, () => {
      messageReceived();
      this._onAckCallbacks.delete(messageId);
      void messageContext.dispose();
      this._monitor.recordReliableMessage({ sendAttempts, sent: true });
    });

    await this._encodeAndSend(ctx, { author, recipient, reliablePayload });
    return promise;
  }

  /**
   * Subscribes onMessage function to messages that contains payload with payloadType.
   * @param payloadType if not specified, onMessage will be subscribed to all types of messages.
   */
  async listen({
    peer,
    payloadType,
    onMessage,
  }: {
    peer: PeerInfo;
    payloadType?: string;
    onMessage: OnMessage;
  }): Promise<ListeningHandle> {
    invariant(!this._closed, 'Closed');
    invariant(peer.peerKey, 'Peer key is required');
    const peerKey = peer.peerKey;

    // Multiplexing is owned by the signal manager. The messenger keeps only reliable delivery
    // (ACK/dedup) and payloadType routing, and passes the transport unsubscribe back through the
    // handle. The unsubscribe is also registered on the messenger context so `close` tears every
    // subscription down; a handle unsubscribed manually clears that registration first.
    const unsubscribe = await this._signalManager.subscribeMessages({
      peer,
      onMessage: (message) => {
        // Subscriptions can outlive a close (they are torn down on dispose, and survive offline/online
        // cycles), so ignore late deliveries and never let a handler rejection escape as unhandled.
        if (this._closed) {
          return;
        }
        log('received message', { from: message.author });
        void this._handleMessage(message).catch((err) => log.catch(err));
      },
    });
    const clearDispose = this._ctx.onDispose(unsubscribe);

    let listeners: Set<OnMessage> | undefined;
    if (!payloadType) {
      listeners = this._defaultListeners.get(peerKey);
      if (!listeners) {
        listeners = new Set();
        this._defaultListeners.set(peerKey, listeners);
      }
    } else {
      listeners = this._listeners.get({ peerId: peerKey, payloadType });
      if (!listeners) {
        listeners = new Set();
        this._listeners.set({ peerId: peerKey, payloadType }, listeners);
      }
    }

    listeners.add(onMessage);

    return {
      unsubscribe: async () => {
        clearDispose();
        listeners!.delete(onMessage);
        await unsubscribe();
      },
    };
  }

  private async _encodeAndSend(
    ctx: Context,
    {
      author,
      recipient,
      reliablePayload,
    }: {
      author: PeerInfo;
      recipient: PeerInfo;
      reliablePayload: ReliablePayload;
    },
  ): Promise<void> {
    await this._signalManager.sendMessage(
      ctx,
      create(MessageSchema, {
        author,
        recipient,
        payload: create(AnySchema, {
          typeUrl: 'dxos.mesh.messaging.ReliablePayload',
          value: toBinary(ReliablePayloadSchema, reliablePayload),
        }),
      }),
    );
  }

  private async _handleMessage(message: Message): Promise<void> {
    const payload = message.payload;
    if (!payload) {
      return;
    }
    switch (payload.typeUrl) {
      case 'dxos.mesh.messaging.ReliablePayload': {
        await this._handleReliablePayload(message);
        break;
      }
      case 'dxos.mesh.messaging.Acknowledgement': {
        await this._handleAcknowledgement({ payload });
        break;
      }
    }
  }

  private async _handleReliablePayload(message: Message): Promise<void> {
    const { author, recipient, payload } = message;
    invariant(payload?.typeUrl === 'dxos.mesh.messaging.ReliablePayload');
    invariant(recipient, 'Recipient is required');
    invariant(author, 'Author is required');
    const reliablePayload = fromBinary(ReliablePayloadSchema, payload.value);
    const messageId = toPublicKey(reliablePayload.messageId);
    invariant(messageId, 'Reliable payload has no message id.');

    log('handling message', { messageId });

    try {
      await this._sendAcknowledgement(this._ctx, {
        author,
        recipient,
        messageId,
      });
    } catch (err) {
      this._monitor.recordMessageAckFailed();
      throw err;
    }

    // Ignore message if it was already received, i.e. from multiple signal servers.
    if (this._receivedMessages.has(messageId)) {
      return;
    }

    this._receivedMessages.add(messageId);

    await this._callListeners(create(MessageSchema, { author, recipient, payload: reliablePayload.payload }));
  }

  private async _handleAcknowledgement({ payload }: { payload: AnyEnvelope }): Promise<void> {
    invariant(payload.typeUrl === 'dxos.mesh.messaging.Acknowledgement');
    const messageId = toPublicKey(fromBinary(AcknowledgementSchema, payload.value).messageId);
    if (messageId) {
      this._onAckCallbacks.get(messageId)?.();
    }
  }

  private async _sendAcknowledgement(
    ctx: Context,
    {
      author,
      recipient,
      messageId,
    }: {
      author: PeerInfo;
      recipient: PeerInfo;
      messageId: PublicKey;
    },
  ): Promise<void> {
    log('sending ACK', { messageId, from: recipient, to: author });

    await this._signalManager.sendMessage(
      ctx,
      create(MessageSchema, {
        author: recipient,
        recipient: author,
        payload: create(AnySchema, {
          typeUrl: 'dxos.mesh.messaging.Acknowledgement',
          value: toBinary(
            AcknowledgementSchema,
            create(AcknowledgementSchema, { messageId: fromPublicKey(messageId) }),
          ),
        }),
      }),
    );
  }

  private async _callListeners(message: Message): Promise<void> {
    const { recipient } = message;
    invariant(recipient?.peerKey, 'Peer key is required');
    const peerKey = recipient.peerKey;
    {
      const defaultListenerMap = this._defaultListeners.get(peerKey);
      if (defaultListenerMap) {
        for (const listener of defaultListenerMap) {
          await listener(message);
        }
      }
    }

    // A message with no payload matches no type-keyed listener, only the default ones above.
    const payloadType = message.payload?.typeUrl;
    if (payloadType !== undefined) {
      const listenerMap = this._listeners.get({ peerId: peerKey, payloadType });
      if (listenerMap) {
        for (const listener of listenerMap) {
          await listener(message);
        }
      }
    }
  }

  private _performGc(): void {
    const start = performance.now();

    for (const key of this._toClear.keys()) {
      this._receivedMessages.delete(key);
    }
    this._toClear.clear();
    for (const key of this._receivedMessages.keys()) {
      this._toClear.add(key);
    }

    const elapsed = performance.now() - start;
    if (elapsed > 100) {
      log.warn('GC took too long', { elapsed });
    }
  }
}

export interface ListeningHandle {
  unsubscribe: () => Promise<void>;
}
