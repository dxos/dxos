//
// Copyright 2022 DXOS.org
//

import { TimeoutError, scheduleExponentialBackoffTaskInterval, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TimeoutError as ProtocolTimeoutError } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type ReliablePayload } from '@dxos/protocols/proto/dxos/mesh/messaging';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { MessengerMonitor } from './messenger-monitor';
import { type SignalManager } from './signal-manager';
import { type Message, type PeerInfo, type UnsubscribeCallback } from './signal-methods';
import { MESSAGE_TIMEOUT } from './timeouts';

export type OnMessage = (params: Message) => Promise<void>;

export interface MessengerOptions {
  signalManager: SignalManager;
  retryDelay?: number;
}

const ReliablePayload = schema.getCodecForType('dxos.mesh.messaging.ReliablePayload');
const Acknowledgement = schema.getCodecForType('dxos.mesh.messaging.Acknowledgement');

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

  /**
   * peerKey => the shared transport subscription for that peer plus a refcount across the listeners
   * registered against it. The subscription's callback drives {@link _handleMessage}; it is created
   * lazily on the first `listen` for a peer and torn down when the last listener unsubscribes.
   */
  private readonly _peerSubscriptions = new Map<string, { unsubscribe: UnsubscribeCallback; count: number }>();

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
    // NOTE: Transport subscriptions are intentionally NOT torn down here. `close`/`open` model a
    // transient transport cycle (e.g. going offline/online), across which the logical listeners — and
    // thus their transport subscriptions — must survive; the swarm does not re-`listen` on reconnect.
    // Real teardown is owned by each {@link ListeningHandle} (Swarm.destroy → unsubscribe).
    await this._ctx.dispose();
  }

  async sendMessage(ctx: Context, message: Message): Promise<void> {
    invariant(!this._closed, 'Closed');
    const { author, recipient, payload } = message;
    // Messenger provides reliable point-to-point delivery; broadcasts are not routed here.
    invariant(recipient, 'Recipient is required');
    const messageContext = this._ctx.derive();

    const reliablePayload: ReliablePayload = {
      messageId: PublicKey.random(),
      payload,
    };
    invariant(!this._onAckCallbacks.has(reliablePayload.messageId!));
    log('send message', { messageId: reliablePayload.messageId, author, recipient });

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
        log('retrying message', { messageId: reliablePayload.messageId });
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
        log('message not delivered', { messageId: reliablePayload.messageId });
        this._onAckCallbacks.delete(reliablePayload.messageId!);
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

    this._onAckCallbacks.set(reliablePayload.messageId, () => {
      messageReceived();
      this._onAckCallbacks.delete(reliablePayload.messageId!);
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

    await this._ensurePeerSubscription(peer);

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
        listeners!.delete(onMessage);
        await this._releasePeerSubscription(peerKey);
      },
    };
  }

  /**
   * Ensure a shared transport subscription exists for `peer`, creating it on first use and bumping a
   * refcount otherwise. Its callback drives reliable-message handling for every listener on this peer.
   */
  private async _ensurePeerSubscription(peer: PeerInfo): Promise<void> {
    invariant(peer.peerKey, 'Peer key is required');
    const existing = this._peerSubscriptions.get(peer.peerKey);
    if (existing) {
      existing.count++;
      return;
    }

    // Register synchronously so concurrent `listen` calls for the same peer share one subscription.
    const entry: { unsubscribe: UnsubscribeCallback; count: number } = { unsubscribe: async () => {}, count: 1 };
    this._peerSubscriptions.set(peer.peerKey, entry);
    try {
      entry.unsubscribe = await this._signalManager.subscribeMessages({
        peer,
        onMessage: (message) => {
          log('received message', { from: message.author });
          void this._handleMessage(message);
        },
      });
    } catch (err) {
      this._peerSubscriptions.delete(peer.peerKey);
      throw err;
    }
  }

  private async _releasePeerSubscription(peerKey: string): Promise<void> {
    const entry = this._peerSubscriptions.get(peerKey);
    if (!entry || --entry.count > 0) {
      return;
    }
    this._peerSubscriptions.delete(peerKey);
    await entry.unsubscribe();
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
    await this._signalManager.sendMessage(ctx, {
      author,
      recipient,
      payload: {
        type_url: 'dxos.mesh.messaging.ReliablePayload',
        value: ReliablePayload.encode(reliablePayload, { preserveAny: true }),
      },
    });
  }

  private async _handleMessage(message: Message): Promise<void> {
    switch (message.payload.type_url) {
      case 'dxos.mesh.messaging.ReliablePayload': {
        await this._handleReliablePayload(message);
        break;
      }
      case 'dxos.mesh.messaging.Acknowledgement': {
        await this._handleAcknowledgement({ payload: message.payload });
        break;
      }
    }
  }

  private async _handleReliablePayload(message: Message): Promise<void> {
    const { author, recipient, payload } = message;
    invariant(payload.type_url === 'dxos.mesh.messaging.ReliablePayload');
    invariant(recipient, 'Recipient is required');
    const reliablePayload: ReliablePayload = ReliablePayload.decode(payload.value, { preserveAny: true });

    log('handling message', { messageId: reliablePayload.messageId });

    try {
      await this._sendAcknowledgement(this._ctx, {
        author,
        recipient,
        messageId: reliablePayload.messageId,
      });
    } catch (err) {
      this._monitor.recordMessageAckFailed();
      throw err;
    }

    // Ignore message if it was already received, i.e. from multiple signal servers.
    if (this._receivedMessages.has(reliablePayload.messageId!)) {
      return;
    }

    this._receivedMessages.add(reliablePayload.messageId!);

    await this._callListeners({
      author,
      recipient,
      payload: reliablePayload.payload,
    });
  }

  private async _handleAcknowledgement({ payload }: { payload: Any }): Promise<void> {
    invariant(payload.type_url === 'dxos.mesh.messaging.Acknowledgement');
    this._onAckCallbacks.get(Acknowledgement.decode(payload.value).messageId)?.();
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

    await this._signalManager.sendMessage(ctx, {
      author: recipient,
      recipient: author,
      payload: {
        type_url: 'dxos.mesh.messaging.Acknowledgement',
        value: Acknowledgement.encode({ messageId }),
      },
    });
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

    {
      const listenerMap = this._listeners.get({
        peerId: peerKey,
        payloadType: message.payload.type_url,
      });
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
