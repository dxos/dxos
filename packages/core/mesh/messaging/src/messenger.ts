//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { TimeoutError, scheduleExponentialBackoffTaskInterval, scheduleTask } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, trace } from '@dxos/protocols';
import { ReliablePayload } from '@dxos/protocols/proto/dxos/mesh/messaging';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { SignalManager } from './signal-manager';
import { Message } from './signal-methods';
import { MESSAGE_TIMEOUT } from './timeouts';

export type OnMessage = (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>;

export interface MessengerOptions {
  signalManager: SignalManager;
  retryDelay?: number;
}

/**
 * Reliable messenger that works trough signal network.
 */
export class Messenger {
  private readonly _signalManager: SignalManager;
  // { peerId, payloadType } => listeners set
  private readonly _listeners = new ComplexMap<{ peerId: PublicKey; payloadType: string }, Set<OnMessage>>(
    ({ peerId, payloadType }) => peerId.toHex() + payloadType,
  );

  // peerId => listeners set
  private readonly _defaultListeners = new ComplexMap<PublicKey, Set<OnMessage>>(PublicKey.hash);

  private readonly _onAckCallbacks = new ComplexMap<PublicKey, () => void>(PublicKey.hash);

  private readonly _receivedMessages = new ComplexSet<PublicKey>((key) => key.toHex());

  private _ctx!: Context;
  private _closed = true;
  private readonly _retryDelay: number;

  constructor({ signalManager, retryDelay = 300 }: MessengerOptions) {
    this._signalManager = signalManager;
    this._retryDelay = retryDelay;

    this.open();
  }

  open() {
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
    this._closed = false;
    log.trace('dxos.mesh.messenger.open', trace.end({ id: traceId }));
  }

  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    await this._ctx.dispose();
  }

  async sendMessage({ author, recipient, payload }: Message): Promise<void> {
    assert(!this._closed, 'Closed');
    const messageContext = this._ctx.derive();

    const reliablePayload: ReliablePayload = {
      messageId: PublicKey.random(),
      payload,
    };
    assert(!this._onAckCallbacks.has(reliablePayload.messageId!));
    log('send message', { messageId: reliablePayload.messageId, author, recipient });

    let messageReceived: () => void;
    let timeoutHit: (err: Error) => void;

    const promise = new Promise<void>((resolve, reject) => {
      messageReceived = resolve;
      timeoutHit = reject;
    });

    // Setting retry interval if signal was not acknowledged.
    scheduleExponentialBackoffTaskInterval(
      messageContext,
      async () => {
        log('retrying message', { messageId: reliablePayload.messageId });
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
        timeoutHit(new TimeoutError(MESSAGE_TIMEOUT, 'Message not delivered'));
        void messageContext.dispose();
      },
      MESSAGE_TIMEOUT,
    );

    this._onAckCallbacks.set(reliablePayload.messageId, () => {
      messageReceived();
      this._onAckCallbacks.delete(reliablePayload.messageId!);
      void messageContext.dispose();
    });

    await this._encodeAndSend({ author, recipient, reliablePayload });

    return promise;
  }

  /**
   * Subscribes onMessage function to messages that contains payload with payloadType.
   * @param payloadType if not specified, onMessage will be subscribed to all types of messages.
   */
  async listen({
    peerId,
    payloadType,
    onMessage,
  }: {
    peerId: PublicKey;
    payloadType?: string;
    onMessage: OnMessage;
  }): Promise<ListeningHandle> {
    assert(!this._closed, 'Closed');

    await this._signalManager.subscribeMessages(peerId);
    let listeners: Set<OnMessage> | undefined;

    if (!payloadType) {
      listeners = this._defaultListeners.get(peerId);
      if (!listeners) {
        listeners = new Set();
        this._defaultListeners.set(peerId, listeners);
      }
    } else {
      listeners = this._listeners.get({ peerId, payloadType });
      if (!listeners) {
        listeners = new Set();
        this._listeners.set({ peerId, payloadType }, listeners);
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
    author: PublicKey;
    recipient: PublicKey;
    reliablePayload: ReliablePayload;
  }): Promise<void> {
    await this._signalManager.sendMessage({
      author,
      recipient,
      payload: {
        type_url: 'dxos.mesh.messaging.ReliablePayload',
        value: schema
          .getCodecForType('dxos.mesh.messaging.ReliablePayload')
          .encode(reliablePayload, { preserveAny: true }),
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

  private async _handleReliablePayload({ author, recipient, payload }: Message) {
    assert(payload.type_url === 'dxos.mesh.messaging.ReliablePayload');
    const reliablePayload: ReliablePayload = schema
      .getCodecForType('dxos.mesh.messaging.ReliablePayload')
      .decode(payload.value, { preserveAny: true });

    log('handling message', { messageId: reliablePayload.messageId });

    await this._sendAcknowledgement({
      author,
      recipient,
      messageId: reliablePayload.messageId,
    });

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

  private async _handleAcknowledgement({ payload }: { payload: Any }) {
    assert(payload.type_url === 'dxos.mesh.messaging.Acknowledgement');
    this._onAckCallbacks.get(
      schema.getCodecForType('dxos.mesh.messaging.Acknowledgement').decode(payload.value).messageId,
    )?.();
  }

  private async _sendAcknowledgement({
    author,
    recipient,
    messageId,
  }: {
    author: PublicKey;
    recipient: PublicKey;
    messageId: PublicKey;
  }): Promise<void> {
    log('sending ACK', { messageId, from: recipient, to: author });

    await this._signalManager.sendMessage({
      author: recipient,
      recipient: author,
      payload: {
        type_url: 'dxos.mesh.messaging.Acknowledgement',
        value: schema.getCodecForType('dxos.mesh.messaging.Acknowledgement').encode({ messageId }),
      },
    });
  }

  private async _callListeners(message: Message): Promise<void> {
    {
      const defaultListenerMap = this._defaultListeners.get(message.recipient);
      if (defaultListenerMap) {
        for (const listener of defaultListenerMap) {
          await listener(message);
        }
      }
    }

    {
      const listenerMap = this._listeners.get({
        peerId: message.recipient,
        payloadType: message.payload.type_url,
      });
      if (listenerMap) {
        for (const listener of listenerMap) {
          await listener(message);
        }
      }
    }
  }
}

export interface ListeningHandle {
  unsubscribe: () => Promise<void>;
}
