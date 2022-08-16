//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet, exponentialBackoffInterval, SubscriptionGroup } from '@dxos/util';

import { Answer, NetworkMessage } from '../proto/gen/dxos/mesh/networkMessage';
import { OfferMessage, SignalMessage, SignalMessaging } from './signal-messaging';

interface OfferRecord {
  resolve: (answer: Answer) => void;
  reject: (error?: Error) => void;
}

interface MessageRouterOptions {
  sendMessage?: (author: PublicKey, recipient: PublicKey, message: NetworkMessage) => Promise<void>;
  onOffer?: (message: OfferMessage) => Promise<Answer>;
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
  private readonly _onSignal: (message: SignalMessage) => Promise<void>;
  private readonly _sendMessage: (author: PublicKey, recipient: PublicKey, message: NetworkMessage) => Promise<void>;
  private readonly _onOffer: (message: OfferMessage) => Promise<Answer>;

  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap(key => key.toHex());
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

  async receiveMessage (author: PublicKey, recipient: PublicKey, message: NetworkMessage): Promise<void> {
    log(`receive message: ${JSON.stringify(message)}`);
    if (!message.data?.ack) {
      if (this._receivedMessages.has(message.messageId!)) {
        return;
      }

      this._receivedMessages.add(message.messageId!);
      await this._sendAcknowledgement(author, recipient, message);
    }

    if (message.data?.offer) {
      await this._handleOffer(author, recipient, message);
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._handleSignal(author, recipient, message);
    } else if (message.data?.ack) {
      await this._handleAcknowledgement(message);
    }
  }

  async signal (message: SignalMessage): Promise<void> {
    assert(message.data?.signal);
    // TODO(mykola): need  to cast SignalMessage to NetworkMessage?
    await this._sendReliableMessage(message.author, message.recipient, message);
  }

  async offer (message: OfferMessage): Promise<Answer> {
    message.messageId = PublicKey.random();
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(message.messageId!, { resolve, reject });
      // TODO(mykola): need  to cast OfferMessage to NetworkMessage?
      return this._sendReliableMessage(message.author, message.recipient, message);
    });
  }

  private async _sendReliableMessage (author: PublicKey, recipient: PublicKey, message: NetworkMessage): Promise<PublicKey> {
    // Setting unique messageId if it not specified yet.
    message.messageId = message.messageId ?? PublicKey.random();
    log(`sent message: ${JSON.stringify(message)}`);

    // Setting retry interval if signal was not acknowledged.
    const cancelRetry = exponentialBackoffInterval(async () => {
      log(`retrying message: ${JSON.stringify(message)}`);
      try {
        await this._sendMessage(author, recipient, message);
      } catch (error) {
        log(`ERROR failed to send message: ${error}`);
      }
    }, this._retryDelay);

    const timeout = setTimeout(() => {
      log(`Message ${message.messageId} was not delivered!`);
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

    await this._sendMessage(author, recipient, message);
    return message.messageId;
  }

  private async _resolveAnswers (message: NetworkMessage): Promise<void> {
    assert(message.data?.answer?.offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(message.data.answer.offerMessageId);
    if (offerRecord) {
      this._offerRecords.delete(message.data.answer.offerMessageId);
      assert(message.data?.answer, 'No Answer');
      log(`resolving answer with ${message.data.answer}`);
      offerRecord.resolve(message.data.answer);
    }
  }

  private async _handleOffer (author: PublicKey, recipient: PublicKey, message: NetworkMessage): Promise<void> {
    assert(message.data?.offer, 'No offer');
    // TODO(mykola): ugly cast.
    const offerMessage = this._castNetworkMessage(author, recipient, message) as OfferMessage;
    const answer = await this._onOffer(offerMessage);
    answer.offerMessageId = message.messageId;
    const answerMessage: NetworkMessage = {
      topic: message.topic,
      sessionId: message.sessionId,
      data: { answer }
    };
    await this._sendReliableMessage(recipient, author, answerMessage);
  }

  private async _handleSignal (author: PublicKey, recipient: PublicKey, message: NetworkMessage): Promise<void> {
    assert(message.messageId);
    const signalMessage = this._castNetworkMessage(author, recipient, message) as SignalMessage;
    await this._onSignal(signalMessage);
  }

  private async _handleAcknowledgement (message: NetworkMessage): Promise<void> {
    assert(message.data?.ack?.messageId);
    this._onAckCallbacks.get(message.data.ack.messageId)?.();
  }

  private async _sendAcknowledgement (author: PublicKey, recipient: PublicKey, message: NetworkMessage): Promise<void> {
    assert(message.messageId);
    const ackMessage = {
      topic: message.topic,
      sessionId: message.sessionId,
      data: { ack: { messageId: message.messageId } }
    };
    log(`sent ack: ${JSON.stringify(ackMessage)}`);
    await this._sendMessage(author, recipient, ackMessage);
  }

  private _castNetworkMessage (author: PublicKey, recipient: PublicKey, message: NetworkMessage) {
    return {
      author,
      recipient,
      messageId: message.messageId,
      data: message.data,
      topic: message.topic,
      sessionId: message.sessionId
    };
  }

  destroy (): void {
    this._subscriptions.unsubscribe();
  }
}
