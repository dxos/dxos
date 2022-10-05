//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Answer, SwarmMessage } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, ComplexSet, MakeOptional } from '@dxos/util';

import {
  OfferMessage,
  SignalMessage,
  SignalMessaging
} from './signal-messaging';

interface OfferRecord {
  resolve: (answer: Answer) => void
  reject: (error?: Error) => void
}

interface MessageRouterOptions {
  sendMessage?: (params: {
    author: PublicKey
    recipient: PublicKey
    payload: Any
  }) => Promise<void>
  onOffer?: (message: OfferMessage) => Promise<Answer>
  onSignal?: (message: SignalMessage) => Promise<void>
}

/**
 * Adds offer/answer RPC and reliable messaging.
 */
export class MessageRouter implements SignalMessaging {
  private readonly _onSignal: (message: SignalMessage) => Promise<void>;
  private readonly _sendMessage: ({
    author,
    recipient,
    payload
  }: {
    author: PublicKey
    recipient: PublicKey
    payload: Any
  }) => Promise<void>;

  private readonly _onOffer: (message: OfferMessage) => Promise<Answer>;

  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> =
    new ComplexMap((key) => key.toHex());

  // NOTE: Potential memory leak: This will grow indefinitely for long-lived sessions.
  // TODO(dmaretskyi): Clean old records from the set with some timeout.
  private readonly _receivedMessages = new ComplexSet<PublicKey>(key => key.toHex());

  constructor ({ sendMessage, onSignal, onOffer }: MessageRouterOptions = {}) {
    assert(sendMessage);
    this._sendMessage = sendMessage;
    assert(onSignal);
    this._onSignal = onSignal;
    assert(onOffer);
    this._onOffer = onOffer;
  }

  async receiveMessage ({
    author,
    recipient,
    payload
  }: {
    author: PublicKey
    recipient: PublicKey
    payload: Any
  }): Promise<void> {
    if (payload.type_url !== 'dxos.mesh.swarm.SwarmMessage') {
      // Ignore not swarm messages.
      return;
    }
    const message: SwarmMessage = schema
      .getCodecForType('dxos.mesh.swarm.SwarmMessage')
      .decode(payload.value);

    if(this._receivedMessages.has(message.messageId)) {
      return; // Ignore duplicate messages.
    }
    this._receivedMessages.add(message.messageId);

    log(
      `receive message: ${JSON.stringify(
        message
      )} from ${author} to ${recipient}`
    );

    if (message.data?.offer) {
      await this._handleOffer({ author, recipient, message });
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._handleSignal({ author, recipient, message });
    }
  }

  async signal (message: SignalMessage): Promise<void> {
    assert(message.data?.signal);
    await this._sendReliableMessage({
      author: message.author,
      recipient: message.recipient,
      message
    });
  }

  async offer (message: OfferMessage): Promise<Answer> {
    const networkMessage: SwarmMessage = {
      ...message,
      messageId: PublicKey.random()
    };
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(networkMessage.messageId!, { resolve, reject });
      return this._sendReliableMessage({
        author: message.author,
        recipient: message.recipient,
        message: networkMessage
      });
    });
  }

  private async _sendReliableMessage ({
    author,
    recipient,
    message
  }: {
    author: PublicKey
    recipient: PublicKey
    message: MakeOptional<SwarmMessage, 'messageId'>
  }): Promise<void> {
    const networkMessage: SwarmMessage = {
      ...message,
      // Setting unique message_id if it not specified yet.
      messageId: message.messageId ?? PublicKey.random()
    };
    log(
      `sent message: ${JSON.stringify(
        networkMessage
      )} from ${author} to ${recipient}`
    );

    await this._encodeAndSend({ author, recipient, message: networkMessage });
  }

  private async _encodeAndSend ({
    author,
    recipient,
    message
  }: {
    author: PublicKey
    recipient: PublicKey
    message: SwarmMessage
  }) {
    await this._sendMessage({
      author,
      recipient,
      payload: {
        type_url: 'dxos.mesh.swarm.SwarmMessage',
        value: schema
          .getCodecForType('dxos.mesh.swarm.SwarmMessage')
          .encode(message)
      }
    });
  }

  private async _resolveAnswers (message: SwarmMessage): Promise<void> {
    assert(message.data?.answer?.offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(
      message.data.answer.offerMessageId
    );
    if (offerRecord) {
      this._offerRecords.delete(message.data.answer.offerMessageId);
      assert(message.data?.answer, 'No Answer');
      log(`resolving answer with ${message.data.answer}`);
      offerRecord.resolve(message.data.answer);
    }
  }

  private async _handleOffer ({
    author,
    recipient,
    message
  }: {
    author: PublicKey
    recipient: PublicKey
    message: SwarmMessage
  }): Promise<void> {
    assert(message.data.offer, 'No offer');
    const offerMessage: OfferMessage = {
      author,
      recipient,
      ...message,
      data: { offer: message.data.offer }
    };
    const answer = await this._onOffer(offerMessage);
    answer.offerMessageId = message.messageId;
    await this._sendReliableMessage({
      author: recipient,
      recipient: author,
      message: {
        topic: message.topic,
        sessionId: message.sessionId,
        data: { answer }
      }
    });
  }

  private async _handleSignal ({
    author,
    recipient,
    message
  }: {
    author: PublicKey
    recipient: PublicKey
    message: SwarmMessage
  }): Promise<void> {
    // console.log('handle signal', { author, recipient, message });
    assert(message.messageId);
    assert(message.data.signal, 'No Signal');
    const signalMessage: SignalMessage = {
      author,
      recipient,
      ...message,
      data: { signal: message.data.signal }
    };
    await this._onSignal(signalMessage);
  }
}
