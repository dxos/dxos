//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { SignalMessaging } from './signal-manager';

interface OfferRecord {
  resolve: (answer: Answer) => void;
  reject: (error?: Error) => void;
}

interface MessageRouterOptions {
  onSignal: (message: Message) => Promise<void>;
  sendMessage: (message: Message) => Promise<void>;
  onOffer: (message: Message) => Promise<Answer>;
}

/**
 * Adds offer/answer RPC and reliable messaging.
 */
// TODO(mykola): https://github.com/dxos/protocols/issues/1316
export class MessageRouter implements SignalMessaging {
  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap(key => key.toHex());
  private readonly _onSignal: (message: Message) => Promise<void>;
  private readonly _sendMessage: (message: Message) => Promise<void>;
  private readonly _onOffer: (message: Message) => Promise<Answer>;

  constructor ({
    sendMessage,
    onSignal,
    onOffer
  }: MessageRouterOptions) {
    this._sendMessage = sendMessage;
    this._onSignal = onSignal;
    this._onOffer = onOffer;
  }

  async receiveMessage (message: Message): Promise<void> {
    if (message.data?.offer) {
      await this._handleOffer(message);
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._onSignal(message);
    }
  }

  async signal (message: Message): Promise<void> {
    assert(message.data?.signal);
    await this._sendMessage(message);
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
}
