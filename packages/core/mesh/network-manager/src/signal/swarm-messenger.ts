//
// Copyright 2020 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message, type PeerInfo } from '@dxos/messaging';
import { TimeoutError } from '@dxos/protocols';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  type Answer,
  type MessageData,
  MessageDataSchema,
  type SwarmMessage,
  SwarmMessageSchema,
} from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { ComplexMap } from '@dxos/util';

import { type OfferMessage, type SignalMessage, type SignalMessenger } from './signal-messenger';

interface OfferRecord {
  resolve: (answer: Answer) => void;
}

export type SwarmMessengerOptions = {
  sendMessage: (ctx: Context, params: Message) => Promise<void>;
  onOffer: (ctx: Context, message: OfferMessage) => Promise<Answer>;
  onSignal: (ctx: Context, message: SignalMessage) => Promise<void>;
  topic: PublicKey;
};

/**
 * Adds offer/answer and signal interfaces.
 */
export class SwarmMessenger implements SignalMessenger {
  private readonly _sendMessage: SwarmMessengerOptions['sendMessage'];
  private readonly _onSignal: SwarmMessengerOptions['onSignal'];
  private readonly _onOffer: SwarmMessengerOptions['onOffer'];
  private readonly _topic: PublicKey;

  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap((key) => key.toHex());

  constructor({ sendMessage, onSignal, onOffer, topic }: SwarmMessengerOptions) {
    this._sendMessage = sendMessage;
    this._onSignal = onSignal;
    this._onOffer = onOffer;
    this._topic = topic;
  }

  async receiveMessage(ctx: Context, { author, recipient, payload }: Message): Promise<void> {
    if (payload.typeUrl !== 'dxos.mesh.swarm.SwarmMessage') {
      // Ignore not swarm messages.
      return;
    }
    // Swarm signaling is point-to-point; a broadcast (DX-1125) never carries a SwarmMessage payload.
    invariant(recipient, 'Recipient is required');
    const message = fromBinary(SwarmMessageSchema, payload.value);

    if (!toPublicKey(message.topic)?.equals(this._topic)) {
      // Ignore messages from wrong topics.
      return;
    }

    log('received', { from: author, to: recipient, msg: message });

    switch (message.data?.payload.case) {
      case 'offer':
        await this._handleOffer(ctx, { author, recipient, message });
        break;
      case 'answer':
        await this._resolveAnswers(message);
        break;
      case 'signal':
      case 'signalBatch':
        await this._handleSignal(ctx, { author, recipient, message });
        break;
      default:
        log.warn('unknown message', { message });
    }
  }

  async signal(ctx: Context, message: SignalMessage): Promise<void> {
    const data = message.data.signal
      ? messageData({ case: 'signal', value: message.data.signal })
      : messageData({ case: 'signalBatch', value: message.data.signalBatch });
    await this._sendReliableMessage(ctx, {
      author: message.author,
      recipient: message.recipient,
      message: swarmMessage(message, data),
    });
  }

  async offer(ctx: Context, message: OfferMessage): Promise<Answer> {
    const messageId = PublicKey.random();
    const networkMessage = swarmMessage(message, messageData({ case: 'offer', value: message.data.offer }), messageId);
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(messageId, { resolve });
      this._sendReliableMessage(ctx, {
        author: message.author,
        recipient: message.recipient,
        message: networkMessage,
      }).catch((err) => reject(err));
    });
  }

  private async _sendReliableMessage(
    ctx: Context,
    {
      author,
      recipient,
      message,
    }: {
      author: PeerInfo;
      recipient: PeerInfo;
      message: SwarmMessage;
    },
  ): Promise<void> {
    // Setting unique message_id if it not specified yet.
    const networkMessage = message.messageId
      ? message
      : create(SwarmMessageSchema, { ...message, messageId: fromPublicKey(PublicKey.random()) });

    log('sending', { from: author, to: recipient, msg: networkMessage });
    await this._sendMessage(ctx, {
      author,
      recipient,
      payload: {
        typeUrl: 'dxos.mesh.swarm.SwarmMessage',
        value: toBinary(SwarmMessageSchema, networkMessage),
      },
    });
  }

  private async _resolveAnswers(message: SwarmMessage): Promise<void> {
    invariant(message.data?.payload.case === 'answer', 'No answer');
    const answer = message.data.payload.value;
    const offerMessageId = toPublicKey(answer.offerMessageId);
    invariant(offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(offerMessageId);
    if (offerRecord) {
      this._offerRecords.delete(offerMessageId);
      log('resolving', { answer });
      offerRecord.resolve(answer);
    }
  }

  private async _handleOffer(
    ctx: Context,
    {
      author,
      recipient,
      message,
    }: {
      author: PeerInfo;
      recipient: PeerInfo;
      message: SwarmMessage;
    },
  ): Promise<void> {
    invariant(message.data?.payload.case === 'offer', 'No offer');
    const topic = toPublicKey(message.topic);
    const sessionId = toPublicKey(message.sessionId);
    invariant(topic && sessionId, 'Swarm message is missing its topic or session.');
    const answer = await this._onOffer(ctx, {
      author,
      recipient,
      topic,
      sessionId,
      data: { offer: message.data.payload.value },
    });
    answer.offerMessageId = message.messageId;
    try {
      await this._sendReliableMessage(ctx, {
        author: recipient,
        recipient: author,
        message: create(SwarmMessageSchema, {
          topic: message.topic,
          sessionId: message.sessionId,
          data: messageData({ case: 'answer', value: answer }),
        }),
      });
    } catch (err) {
      if (err instanceof TimeoutError) {
        log.info('timeout sending answer to offer', { err });
      } else {
        log.info('error sending answer to offer', { err });
      }
    }
  }

  private async _handleSignal(
    ctx: Context,
    {
      author,
      recipient,
      message,
    }: {
      author: PeerInfo;
      recipient: PeerInfo;
      message: SwarmMessage;
    },
  ): Promise<void> {
    invariant(message.messageId);
    const payload = message.data?.payload;
    invariant(payload?.case === 'signal' || payload?.case === 'signalBatch', 'Invalid message');
    const topic = toPublicKey(message.topic);
    const sessionId = toPublicKey(message.sessionId);
    invariant(topic && sessionId, 'Swarm message is missing its topic or session.');

    await this._onSignal(ctx, {
      author,
      recipient,
      topic,
      sessionId,
      data: payload.case === 'signal' ? { signal: payload.value } : { signalBatch: payload.value },
    });
  }
}

/** Wraps a signalling payload as the swarm message's `data` oneof. */
const messageData = (payload: MessageData['payload']): MessageData => create(MessageDataSchema, { payload });

/** The wire message for a domain offer or signal, whose keys are `PublicKey` instances. */
const swarmMessage = (
  message: { topic: PublicKey; sessionId: PublicKey },
  data: MessageData,
  messageId?: PublicKey,
): SwarmMessage =>
  create(SwarmMessageSchema, {
    topic: fromPublicKey(message.topic),
    sessionId: fromPublicKey(message.sessionId),
    data,
    messageId: messageId && fromPublicKey(messageId),
  });
