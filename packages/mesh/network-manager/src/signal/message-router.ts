//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet, exponentialBackoffInterval, SubscriptionGroup } from '@dxos/util';

import { Answer, SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalMessaging } from './signal-manager';

interface OfferRecord {
  resolve: (answer: Answer) => void;
  reject: (error?: Error) => void;
}

interface MessageRouterOptions {
  sendMessage?: (message: SignalMessage) => Promise<void>;
  onOffer?: (message: SignalMessage) => Promise<Answer>;
  onSignal?: (message: SignalMessage) => Promise<void>;
  retryDelay?: number;
  timeout?: number;
}

const log = debug('dxos:network-manager:message-router');
/**
 * Adds offer/answer RPC and reliable messaging.
 */
// TODO(mykola): https://github.com/dxos/protocols/issues/1316
export class MessageRouter implements SignalMessaging {
  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap(key => key.toHex());
  private readonly _onSignal: (message: SignalMessage) => Promise<void>;
  private readonly _sendMessage: (message: SignalMessage) => Promise<void>;
  private readonly _onOffer: (message: SignalMessage) => Promise<Answer>;

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

  async receiveMessage (message: SignalMessage): Promise<void> {
    log(`receive message: ${JSON.stringify(message)}`);
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

  async signal (message: SignalMessage): Promise<void> {
    assert(message.data?.signal);
    await this._sendReliableMessage(message);
  }

  async offer (message: SignalMessage): Promise<Answer> {
    message.messageId = PublicKey.random();
    const promise = new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(message.messageId!, { resolve, reject });
      return this._sendReliableMessage(message);
    });
    return promise;
  }

  private async _sendReliableMessage (message: SignalMessage): Promise<PublicKey> {
    // Setting unique messageId if it not specified yet.
    message.messageId = message.messageId ?? PublicKey.random();
    log(`sent message: ${JSON.stringify(message)}`);

    // Setting retry interval if signal was not acknowledged.
    const cancelRetry = exponentialBackoffInterval(async () => {
      log(`retrying message: ${JSON.stringify(message)}`);
      try {
        await this._sendMessage(message);
      } catch (error) {
        log(`ERROR failed to send message: ${error}`);
      }
    }, this._retryDelay);

    const timeout = setTimeout(() => {
      log('Signal was not delivered!');
      this._onAckCallbacks.delete(message.messageId!);
      cancelRetry();
    }, this._timeout);

    assert(!this._onAckCallbacks.has(message.messageId!));
    this._onAckCallbacks.set(message.messageId, () => {
      this._onAckCallbacks.delete(message.messageId!);
      cancelRetry();
      clearTimeout(timeout);
    });
    this._subscriptions.push(cancelRetry);
    this._subscriptions.push(() => clearTimeout(timeout));

    await this._sendMessage(message);
    return message.messageId;
  }

  private async _resolveAnswers (message: SignalMessage): Promise<void> {
    assert(message.data?.answer?.offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(message.data.answer.offerMessageId);
    if (offerRecord) {
      this._offerRecords.delete(message.data.answer.offerMessageId);
      assert(message.data?.answer, 'No Answer');
      log(`resolving answer with ${message.data.answer}`);
      offerRecord.resolve(message.data.answer);
    }
  }

  private async _handleOffer (message: SignalMessage): Promise<void> {
    const answer = await this._onOffer(message);
    answer.offerMessageId = message.messageId;
    const answerMessage: SignalMessage = {
      id: message.remoteId,
      remoteId: message.id,
      topic: message.topic,
      sessionId: message.sessionId,
      data: { answer }
    };
    await this._sendReliableMessage(answerMessage);
  }

  private async _handleSignal (message: SignalMessage): Promise<void> {
    assert(message.messageId);
    await this._onSignal(message);
  }

  private async _handleAcknowledgement (message: SignalMessage): Promise<void> {
    assert(message.data?.ack?.messageId);
    this._onAckCallbacks.get(message.data.ack.messageId)?.();
  }

  private async _sendAcknowledgement (message: SignalMessage): Promise<void> {
    assert(message.messageId);
    const ackMessage = {
      id: message.remoteId,
      remoteId: message.id,
      topic: message.topic,
      sessionId: message.sessionId,
      data: { ack: { messageId: message.messageId } }
    };
    log(`sent ack: ${JSON.stringify(ackMessage)}`);
    await this._sendMessage(ackMessage);
  }

  destroy (): void {
    this._subscriptions.unsubscribe();
  }
}
