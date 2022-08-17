//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap, ComplexSet, exponentialBackoffInterval, MakeOptional, SubscriptionGroup } from '@dxos/util';

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
    log(`receive message: ${JSON.stringify(message)} from ${author} to ${recipient}`);
    if (!message.data?.ack) {
      if (this._receivedMessages.has(message.messageId!)) {
        return;
      }

      this._receivedMessages.add(message.messageId!);
      await this._sendAcknowledgement(recipient, author, message);
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
    await this._sendReliableMessage(message.author, message.recipient, message);
  }

  async offer (message: OfferMessage): Promise<Answer> {
    message.messageId = PublicKey.random();
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(message.messageId!, { resolve, reject });
      return this._sendReliableMessage(message.author, message.recipient, message);
    });
  }

  private async _sendReliableMessage (author: PublicKey, recipient: PublicKey, message: MakeOptional<NetworkMessage, 'messageId'>): Promise<void> {
    const networkMessage: NetworkMessage = {
      topic: message.topic,
      sessionId: message.sessionId,
      // Setting unique messageId if it not specified yet.
      messageId: message.messageId ?? PublicKey.random(),
      data: message.data
    };
    log(`sent message: ${JSON.stringify(networkMessage)} from ${author} to ${recipient}`);

    // Setting retry interval if signal was not acknowledged.
    const cancelRetry = exponentialBackoffInterval(async () => {
      log(`retrying message: ${JSON.stringify(networkMessage)}`);
      try {
        await this._sendMessage(author, recipient, networkMessage);
      } catch (error) {
        log(`ERROR failed to send message: ${error}`);
      }
    }, this._retryDelay);

    const timeout = setTimeout(() => {
      log(`Message ${networkMessage.messageId} was not delivered!`);
      this._onAckCallbacks.delete(networkMessage.messageId!);
      cancelRetry();
    }, this._timeout);

    assert(!this._onAckCallbacks.has(networkMessage.messageId!));
    this._onAckCallbacks.set(networkMessage.messageId, () => {
      this._onAckCallbacks.delete(networkMessage.messageId!);
      cancelRetry();
      clearTimeout(timeout);
    });
    this._subscriptions.push(cancelRetry);
    this._subscriptions.push(() => clearTimeout(timeout));

    await this._sendMessage(author, recipient, networkMessage);
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
    await this._sendReliableMessage(
      recipient,
      author,
      {
        topic: message.topic,
        sessionId: message.sessionId,
        data: { answer }
      }
    );
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
    const ackMessage: NetworkMessage = {
      topic: message.topic,
      sessionId: message.sessionId,
      data: { ack: { messageId: message.messageId } },
      messageId: PublicKey.random()
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
