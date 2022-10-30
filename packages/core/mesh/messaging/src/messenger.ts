//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { EventSubscriptions } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { ReliablePayload } from '@dxos/protocols/proto/dxos/mesh/messaging';
import { ComplexMap, ComplexSet, exponentialBackoffInterval } from '@dxos/util';

import { SignalManager } from './signal-manager';
import { Message } from './signal-methods';

export type OnMessage = (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>;

export interface MessengerOptions {
  signalManager: SignalManager;
  retryDelay?: number;
  timeout?: number;
}

export class Messenger {
  private readonly _signalManager: SignalManager;
  // { peerId, payloadType } => listeners set
  private readonly _listeners = new ComplexMap<{ peerId: PublicKey; payloadType: string }, Set<OnMessage>>(
    ({ peerId, payloadType }) => peerId.toHex() + payloadType
  );

  // peerId => listeners set
  private readonly _defaultListeners = new ComplexMap<PublicKey, Set<OnMessage>>(PublicKey.hash);

  private readonly _onAckCallbacks = new ComplexMap<PublicKey, () => void>(PublicKey.hash);

  private readonly _receivedMessages = new ComplexSet<PublicKey>((key) => key.toHex());

  private readonly _subscriptions = new EventSubscriptions(); // TODO(burdon): Not released.
  private readonly _retryDelay: number;
  private readonly _timeout: number;

  constructor({ signalManager, retryDelay = 100, timeout = 3000 }: MessengerOptions) {
    this._signalManager = signalManager;
    this._signalManager.onMessage.on(async (message) => {
      log(`Received message from ${message.author}`);
      await this._handleMessage(message);
    });

    this._retryDelay = retryDelay;
    this._timeout = timeout;
  }

  async sendMessage({ author, recipient, payload }: Message): Promise<void> {
    const reliablePayload: ReliablePayload = {
      messageId: PublicKey.random(),
      payload
    };

    log('sent message', {
      messageId: reliablePayload.messageId,
      author,
      recipient
    });

    // Setting retry interval if signal was not acknowledged.
    const cancelRetry = exponentialBackoffInterval(async () => {
      log(`Retrying message ${reliablePayload.messageId}`);
      try {
        await this._encodeAndSend({
          author,
          recipient,
          reliablePayload
        });
      } catch (error) {
        log.error(`ERROR failed to send message: ${error}`);
      }
    }, this._retryDelay);

    const timeout = setTimeout(() => {
      log(`Message ${reliablePayload.messageId} was not delivered!`);
      this._onAckCallbacks.delete(reliablePayload.messageId!);
      cancelRetry();
    }, this._timeout);

    assert(!this._onAckCallbacks.has(reliablePayload.messageId!));
    this._onAckCallbacks.set(reliablePayload.messageId, () => {
      this._onAckCallbacks.delete(reliablePayload.messageId!);
      cancelRetry();
      clearTimeout(timeout);
    });

    this._subscriptions.add(() => {
      cancelRetry();
      clearTimeout(timeout);
    });

    await this._encodeAndSend({ author, recipient, reliablePayload });
  }

  /**
   * Subscribes onMessage function to messages that contains payload with payloadType.
   * @param payloadType if not specified, onMessage will be subscribed to all types of messages.
   */
  async listen({
    peerId,
    payloadType,
    onMessage
  }: {
    peerId: PublicKey;
    payloadType?: string;
    onMessage: OnMessage;
  }): Promise<ListeningHandle> {
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
      }
    };
  }

  private async _encodeAndSend({
    author,
    recipient,
    reliablePayload
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
          .encode(reliablePayload, { preserveAny: true })
      }
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

    log(`Handling message with ${reliablePayload.messageId}`);

    if (this._receivedMessages.has(reliablePayload.messageId!)) {
      return;
    }
    this._receivedMessages.add(reliablePayload.messageId!);
    await this._sendAcknowledgement({
      author,
      recipient,
      messageId: reliablePayload.messageId
    });

    await this._callListeners({
      author,
      recipient,
      payload: reliablePayload.payload
    });
  }

  private async _handleAcknowledgement({ payload }: { payload: Any }) {
    assert(payload.type_url === 'dxos.mesh.messaging.Acknowledgement');
    this._onAckCallbacks.get(
      schema.getCodecForType('dxos.mesh.messaging.Acknowledgement').decode(payload.value).messageId
    )?.();
  }

  private async _sendAcknowledgement({
    author,
    recipient,
    messageId
  }: {
    author: PublicKey;
    recipient: PublicKey;
    messageId: PublicKey;
  }): Promise<void> {
    log(`Sent ack: ${messageId} from ${recipient} to ${author}`);
    await this._signalManager.sendMessage({
      author: recipient,
      recipient: author,
      payload: {
        type_url: 'dxos.mesh.messaging.Acknowledgement',
        value: schema.getCodecForType('dxos.mesh.messaging.Acknowledgement').encode({ messageId })
      }
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
        payloadType: message.payload.type_url
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
