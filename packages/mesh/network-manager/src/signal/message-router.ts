//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap, SubscriptionGroup } from '@dxos/util';

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

  private readonly _sentSignalsVSClearInterval = new ComplexMap<PublicKey, () => void>(key => key.toHex());
  private readonly _receivedSignals = new Set<PublicKey>();
  private readonly _acknowledgedSignals = new Set<PublicKey>();
  private readonly _retryDelay: number;
  private readonly _timeout: number;

  private readonly _subs = new SubscriptionGroup();

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
    message.messageId = PublicKey.random();
    await this._sendMessage(message);

    // Setting retry interval if signal was not acknowledged.
    const clearInterval = exponentialBackoffInterval(async () => {
      if (!this._acknowledgedSignals.has(message.messageId!)) {
        await this._sendMessage(message);
      }
    }, this._retryDelay);
    this._sentSignalsVSClearInterval.set(message.messageId, clearInterval);
    this._subs.push(() => clearInterval());
    setTimeout(() => {
      if (this._acknowledgedSignals.has(message.messageId!)) {
        this._acknowledgedSignals.delete(message.messageId!);
      } else {
        log('Signal was not delivered!');
      }
      this._sentSignalsVSClearInterval.delete(message.messageId!);
      clearInterval();
    }, this._timeout);
  }

  async offer (message: Message): Promise<Answer> {
    const promise = new Promise<Answer>((resolve, reject) => {
      assert(message.sessionId);
      this._offerRecords.set(message.sessionId, { resolve, reject });
    });
    await this._sendMessage(message);
    return promise;
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
    await this._sendMessage(answerMessage);
  }

  private async _handleSignal (message: Message): Promise<void> {
    assert(message.messageId);
    if (!this._receivedSignals.has(message.messageId)) {
      this._receivedSignals.add(message.messageId);
      await this._onSignal(message);
      await this._sendMessage({
        id: message.remoteId,
        remoteId: message.id,
        topic: message.topic,
        data: { ack: { messageId: message.messageId } }
      });
    }
  }

  private async _handleAcknowledgement (message: Message): Promise<void> {
    assert(message.data?.ack);
    assert(message.data.ack.messageId);
    if (!this._acknowledgedSignals.has(message.data.ack.messageId)) {
      this._acknowledgedSignals.add(message.data.ack.messageId);
      // Clearing retry interval.
      const clearInterval = this._sentSignalsVSClearInterval.get(message.data.ack.messageId);
      if (clearInterval) {
        clearInterval();
        this._sentSignalsVSClearInterval.delete(message.data.ack.messageId);
      }
    }
  }

  destroy (): void {
    this._subs.unsubscribe();
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
