//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet, SubscriptionGroup } from '@dxos/util';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { SignalMessaging } from './signal-manager';

interface OfferRecord {
  resolve: (answer: Answer) => void;
  reject: (error?: Error) => void;
}

interface MessageRouterOptions {
  onSignal?: (message: Message) => Promise<void>;
  sendMessage?: (message: Message) => Promise<void>;
  onOffer?: (message: Message) => Promise<Answer>;
  retryDelay?: number;
  timeout?: number;
}

const log = debug('dxos:message-router');
/**
 * Adds offer/answer RPC and reliable messaging.
 */
// TODO(mykola): https://github.com/dxos/protocols/issues/1316
export class MessageRouter implements SignalMessaging {
  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap(key => key.toHex());
  private readonly _onSignal: (message: Message) => Promise<void>;
  private readonly _sendMessage: (message: Message) => Promise<void>;
  private readonly _onOffer: (message: Message) => Promise<Answer>;

  private readonly _onAckCallbacks = new ComplexMap<PublicKey, () => void>(key => key.toHex());
  private readonly _receivedMessages = new ComplexSet<PublicKey>(key => key.toHex());
  private readonly _retryDelay: number;
  private readonly _timeout: number;

  private readonly _subscriptions = new SubscriptionGroup();

  constructor ({
    sendMessage,
    onSignal,
    onOffer,
    retryDelay = 100,
    timeout = 3000
  }: MessageRouterOptions = {}) {
    assert(sendMessage);
    this._sendMessage = sendMessage;
    assert(onSignal);
    this._onSignal = onSignal;
    assert(onOffer);
    this._onOffer = onOffer;
    this._retryDelay = retryDelay;
    this._timeout = timeout;
  }

  async receiveMessage (message: Message): Promise<void> {
    if (!message.data?.ack) {
      if (this._receivedMessages.has(message.messageId!)) {
        return;
      }

      this._receivedMessages.add(message.messageId!);
      await this._sendAcknowledgement(message);
    }

    if (message.data?.offer) {
      await this._handleOffer(message);
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._handleSignal(message);
    } else if (message.data?.ack) {
      await this._handleAcknowledgement(message);
    }
  }

  async signal (message: Message): Promise<void> {
    assert(message.data?.signal);
    await this._sendReliableMessage(message);
  }

  async offer (message: Message): Promise<Answer> {
    const promise = new Promise<Answer>((resolve, reject) => {
      assert(message.sessionId);
      this._offerRecords.set(message.sessionId, { resolve, reject });
    });
    await this._sendReliableMessage(message);
    return promise;
  }

  private async _sendReliableMessage (message: Message): Promise<void> {
    message.messageId = PublicKey.random();
    await this._sendMessage(message);

    // Setting retry interval if signal was not acknowledged.
    const cancelRetry = exponentialBackoffInterval(() => this._sendMessage(message), this._retryDelay);

    const timeout = setTimeout(() => {
      log('Signal was not delivered!');
      this._onAckCallbacks.delete(message.messageId!);
      cancelRetry();
    }, this._timeout);

    this._onAckCallbacks.set(message.messageId, () => {
      this._onAckCallbacks.delete(message.messageId!);
      cancelRetry();
      clearTimeout(timeout);
    });
    this._subscriptions.push(() => cancelRetry());

  }

  private async _resolveAnswers (message: Message): Promise<void> {
    assert(message.sessionId);
    const offerRecord = this._offerRecords.get(message.sessionId);
    if (offerRecord) {
      this._offerRecords.delete(message.sessionId);
      assert(message.data?.answer);
      offerRecord.resolve(message.data.answer);
    }
  }

  private async _handleOffer (message: Message): Promise<void> {
    const answer = await this._onOffer(message);
    const answerMessage = {
      id: message.remoteId,
      remoteId: message.id,
      topic: message.topic,
      sessionId: message.sessionId,
      data: { answer: answer }
    };
    await this._sendReliableMessage(answerMessage);
  }

  private async _handleSignal (message: Message): Promise<void> {
    assert(message.messageId);
    await this._onSignal(message);
  }

  private async _handleAcknowledgement (message: Message): Promise<void> {
    assert(message.data?.ack);
    assert(message.data.ack.messageId);
    this._onAckCallbacks.get(message.data.ack.messageId)?.();
  }

  private async _sendAcknowledgement (message: Message): Promise<void> {
    assert(message.messageId);
    const ackMessage = {
      id: message.remoteId,
      remoteId: message.id,
      topic: message.topic,
      sessionId: message.sessionId,
      data: { ack: { messageId: message.messageId } }
    };
    await this._sendMessage(ackMessage);
  }

  destroy (): void {
    this._subscriptions.unsubscribe();
  }
}

const exponentialBackoffInterval = (cb: () => void, initialInterval: number): () => void => {
  let interval = initialInterval;
  const repeat = () => {
    cb();
    interval *= 2;
    timeoutId = setTimeout(repeat, interval);
  };
  let timeoutId = setTimeout(repeat, interval);
  return () => clearTimeout(timeoutId);
};
