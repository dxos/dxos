//
// Copyright 2022 DXOS.org
//

import { TimeoutError, scheduleExponentialBackoffTaskInterval, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TimeoutError as ProtocolTimeoutError, trace } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type ReliablePayload } from '@dxos/protocols/proto/dxos/mesh/messaging';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { MessengerMonitor } from './messenger-monitor';
import { type SignalManager } from './signal-manager';
import { type Message, type PeerInfo } from './signal-methods';
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
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.mesh.messenger.open', trace.begin({ id: traceId }));
    this._ctx = new Context({
      onError: (err) => log.catch(err),
    });
    this._ctx.onDispose(
      this._signalManager.onMessage.on(async (message) => {
        log('received message', { from: message.author });
        await this._handleMessage(message);
      }),
    );

    // Clear the map periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this._performGc();
      },
      RECEIVED_MESSAGES_GC_INTERVAL,
    );

    this._closed = false;
    log.trace('dxos.mesh.messenger.open', trace.end({ id: traceId }));
  }

  async close(): Promise<void> {
    if (this._closed) {
      return;
    }
    this._closed = true;
    await this._ctx.dispose();
  }

  async sendMessage({ author, recipient, payload }: Message): Promise<void> {
    invariant(!this._closed, 'Closed');
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
        await this._encodeAndSend({ author, recipient, reliablePayload }).catch((err) =>
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

    await this._encodeAndSend({ author, recipient, reliablePayload });
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

    await this._signalManager.subscribeMessages(peer);
    let listeners: Set<OnMessage> | undefined;
    invariant(peer.peerKey, 'Peer key is required');

    if (!payloadType) {
      listeners = this._defaultListeners.get(peer.peerKey);
      if (!listeners) {
        listeners = new Set();
        this._defaultListeners.set(peer.peerKey, listeners);
      }
    } else {
      listeners = this._listeners.get({ peerId: peer.peerKey, payloadType });
      if (!listeners) {
        listeners = new Set();
        this._listeners.set({ peerId: peer.peerKey, payloadType }, listeners);
      }
    }

    listeners.add(onMessage);

    return {
      unsubscribe: async () => {
        listeners!.delete(onMessage);
      },
    };
  }

  private async _encodeAndSend({
    author,
    recipient,
    reliablePayload,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    reliablePayload: ReliablePayload;
  }): Promise<void> {
    await this._signalManager.sendMessage({
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

  private async _handleReliablePayload({ author, recipient, payload }: Message): Promise<void> {
    invariant(payload.type_url === 'dxos.mesh.messaging.ReliablePayload');
    const reliablePayload: ReliablePayload = ReliablePayload.decode(payload.value, { preserveAny: true });

    log('handling message', { messageId: reliablePayload.messageId });

    try {
      await this._sendAcknowledgement({
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

  private async _sendAcknowledgement({
    author,
    recipient,
    messageId,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    messageId: PublicKey;
  }): Promise<void> {
    log('sending ACK', { messageId, from: recipient, to: author });

    await this._signalManager.sendMessage({
      author: recipient,
      recipient: author,
      payload: {
        type_url: 'dxos.mesh.messaging.Acknowledgement',
        value: Acknowledgement.encode({ messageId }),
      },
    });
  }

  private async _callListeners(message: Message): Promise<void> {
    {
      invariant(message.recipient.peerKey, 'Peer key is required');
      const defaultListenerMap = this._defaultListeners.get(message.recipient.peerKey);
      if (defaultListenerMap) {
        for (const listener of defaultListenerMap) {
          await listener(message);
        }
      }
    }

    {
      const listenerMap = this._listeners.get({
        peerId: message.recipient.peerKey,
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
