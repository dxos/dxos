//
// Copyright 2020 DXOS.org
//

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message, type PeerInfo } from '@dxos/messaging';
import { TimeoutError } from '@dxos/protocols';
import { bufWkt, create, fromBinary, toBinary } from '@dxos/protocols/buf';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { type Answer, SwarmMessageSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { ComplexMap, type MakeOptional } from '@dxos/util';

import { type OfferMessage, type SignalMessage, type SignalMessenger } from './signal-messenger';

interface OfferRecord {
  resolve: (answer: Answer) => void;
}

export type SwarmMessengerOptions = {
  sendMessage: (params: Message) => Promise<void>;
  onOffer: (message: OfferMessage) => Promise<Answer>;
  onSignal: (message: SignalMessage) => Promise<void>;
  topic: PublicKey;
};

/** Strip buf $typeName from an object to get a plain init value for create(). */
const stripBufMeta = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const { $typeName, ...rest } = obj;
  return rest;
};

/** Encode a proto-shaped SwarmMessage (with @dxos/keys PublicKey and direct oneof data fields) to bytes. */
const encodeSwarmMessage = (msg: any): Uint8Array => {
  const encKey = (key: any) => (key ? { data: key instanceof PublicKey ? key.asUint8Array() : key.data } : undefined);
  let data: any;
  if (msg.data) {
    for (const field of ['offer', 'answer', 'signal', 'signalBatch'] as const) {
      if (msg.data[field] != null) {
        let value = stripBufMeta(msg.data[field]);
        if (field === 'answer' && value.offerMessageId) {
          value = { ...value, offerMessageId: encKey(value.offerMessageId) };
        }
        data = { payload: { case: field, value } };
        break;
      }
    }
  }

  return toBinary(SwarmMessageSchema, create(SwarmMessageSchema, {
    topic: encKey(msg.topic),
    sessionId: encKey(msg.sessionId),
    messageId: encKey(msg.messageId),
    data,
  } as any));
};

/** Decode bytes to a proto-shaped SwarmMessage (with @dxos/keys PublicKey and direct oneof data fields). */
const decodeSwarmMessage = (bytes: Uint8Array): any => {
  const decoded = fromBinary(SwarmMessageSchema, bytes);
  const decKey = (key: any) => (key ? PublicKey.from(key.data) : undefined);

  let data: any;
  if (decoded.data) {
    const payload = decoded.data.payload;
    if (payload.case) {
      let value: any = payload.value;
      if (payload.case === 'answer' && value.offerMessageId) {
        value = { ...value, offerMessageId: decKey(value.offerMessageId) };
      }
      data = { [payload.case]: value };
    } else {
      data = {};
    }
  }

  return {
    topic: decKey(decoded.topic),
    sessionId: decKey(decoded.sessionId),
    messageId: decKey(decoded.messageId),
    data,
  };
};

/**
 * Adds offer/answer and signal interfaces.
 */
export class SwarmMessenger implements SignalMessenger {
  private readonly _ctx = new Context();

  private readonly _sendMessage: (msg: Message) => Promise<void>;
  private readonly _onSignal: (message: SignalMessage) => Promise<void>;
  private readonly _onOffer: (message: OfferMessage) => Promise<Answer>;
  private readonly _topic: PublicKey;

  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap((key) => key.toHex());

  constructor({ sendMessage, onSignal, onOffer, topic }: SwarmMessengerOptions) {
    this._sendMessage = sendMessage;
    this._onSignal = onSignal;
    this._onOffer = onOffer;
    this._topic = topic;
  }

  async receiveMessage({
    author,
    recipient,
    payload,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    payload: { typeUrl: string; value: Uint8Array };
  }): Promise<void> {
    if (payload.typeUrl !== 'dxos.mesh.swarm.SwarmMessage') {
      // Ignore not swarm messages.
      return;
    }
    const message: any = decodeSwarmMessage(payload.value);

    if (!this._topic.equals(message.topic)) {
      return;
    }

    log('received', { from: author, to: recipient, msg: message });

    if (message.data?.offer) {
      await this._handleOffer({ author, recipient, message });
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._handleSignal({ author, recipient, message });
    } else if (message.data?.signalBatch) {
      await this._handleSignal({ author, recipient, message });
    } else {
      log.warn('unknown message', { message });
    }
  }

  async signal(message: SignalMessage): Promise<void> {
    invariant((message as any).data?.signal || (message as any).data?.signalBatch, 'Invalid message');
    await this._sendReliableMessage({
      author: message.author,
      recipient: message.recipient,
      message: message as any,
    });
  }

  async offer(message: OfferMessage): Promise<Answer> {
    const networkMessage: any = {
      ...message,
      messageId: PublicKey.random(),
    };
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(networkMessage.messageId!, { resolve });
      this._sendReliableMessage({
        author: message.author,
        recipient: message.recipient,
        message: networkMessage,
      }).catch((err) => reject(err));
    });
  }

  private async _sendReliableMessage({
    author,
    recipient,
    message,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    message: any;
  }): Promise<void> {
    const networkMessage: any = {
      ...message,
      messageId: message.messageId ?? PublicKey.random(),
    };

    log('sending', { from: author, to: recipient, msg: networkMessage });
    await this._sendMessage(
      create(MessageSchema, {
        author,
        recipient,
        payload: create(bufWkt.AnySchema, {
          typeUrl: 'dxos.mesh.swarm.SwarmMessage',
          value: encodeSwarmMessage(networkMessage),
        }),
      }),
    );
  }

  private async _resolveAnswers(message: any): Promise<void> {
    invariant(message.data?.answer?.offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(message.data.answer.offerMessageId);
    if (offerRecord) {
      this._offerRecords.delete(message.data.answer.offerMessageId);
      invariant(message.data?.answer, 'No answer');
      log('resolving', { answer: message.data.answer });
      offerRecord.resolve(message.data.answer as any);
    }
  }

  private async _handleOffer({
    author,
    recipient,
    message,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    message: any;
  }): Promise<void> {
    invariant(message.data.offer, 'No offer');
    const offerMessage: OfferMessage = {
      author,
      recipient,
      ...message,
      data: { offer: message.data.offer as any },
    };
    const answer = await this._onOffer(offerMessage);
    (answer as any).offerMessageId = message.messageId;
    try {
      await this._sendReliableMessage({
        author: recipient,
        recipient: author,
        message: {
          topic: message.topic,
          sessionId: message.sessionId,
          data: { answer: answer as any },
        },
      });
    } catch (err) {
      if (err instanceof TimeoutError) {
        log.info('timeout sending answer to offer', { err });
      } else {
        log.info('error sending answer to offer', { err });
      }
    }
  }

  private async _handleSignal({
    author,
    recipient,
    message,
  }: {
    author: PeerInfo;
    recipient: PeerInfo;
    message: any;
  }): Promise<void> {
    invariant(message.messageId);
    invariant(message.data.signal || message.data.signalBatch, 'Invalid message');
    const signalMessage: SignalMessage = {
      author,
      recipient,
      ...message,
      data: {
        signal: message.data.signal as any,
        signalBatch: message.data.signalBatch as any,
      },
    };

    await this._onSignal(signalMessage);
  }
}
