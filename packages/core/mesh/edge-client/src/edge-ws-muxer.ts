//
// Copyright 2025 DXOS.org
//
import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { MessageSchema, type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';

/**
 * 0000 0001 - message contains a part of segmented message chunk sequence.
 * The next byte defines a channel id and the rest of the message contains a part of Message proto binary.
 * Messages from different channels might interleave.
 * When the flag is NOT set the rest of the message should be interpreted as the valid Message proto binary.
 */
const FLAG_SEGMENT_SEQ = 1;
/**
 * 0000 0010 - message terminates a segmented message chunk sequence.
 * All the chunks accumulated for the channel specified by the second byte can be concatenated
 * and interpreted as a valid Message proto binary.
 */
const FLAG_SEGMENT_SEQ_TERMINATED = 1 << 1;

/**
 * 1MB websocket message limit: https://developers.cloudflare.com/durable-objects/platform/limits/
 */
const CLOUDFLARE_MESSAGE_LENGTH_LIMIT = 1024 * 1024;

const MAX_CHUNK_LENGTH = 16384;
const MAX_BUFFERED_AMOUNT = CLOUDFLARE_MESSAGE_LENGTH_LIMIT;
const BUFFER_FULL_BACKOFF_TIMEOUT = 100;

export class WebSocketMuxer {
  private readonly _incomingMessageAccumulator = new Map<number, Buffer[]>();
  private readonly _outgoingMessageChunks = new Map<number, MessageChunk[]>();
  private readonly _serviceToChannel = new Map<string, number>();

  private _sendTimeout: any | undefined;

  constructor(private readonly _ws: WebSocket) {}

  /**
   * Resolves when all the message chunks get enqueued for sending.
   */
  public async send(message: Message): Promise<void> {
    const binary = buf.toBinary(MessageSchema, message);
    const channelId = this._resolveChannel(message);
    if (channelId == null && binary.length > CLOUDFLARE_MESSAGE_LENGTH_LIMIT) {
      log.error('Large message dropped because channel resolution failed.', {
        byteLength: binary.byteLength,
        serviceId: message.serviceId,
        payload: protocol.getPayloadType(message),
      });
      return;
    }

    if (channelId == null || binary.length < MAX_CHUNK_LENGTH) {
      const flags = Buffer.from([0]);
      this._ws.send(Buffer.concat([flags, binary]));
      return;
    }

    const terminatorSentTrigger = new Trigger();
    const messageChunks: MessageChunk[] = [];
    for (let i = 0; i < binary.length; i += MAX_CHUNK_LENGTH) {
      const chunk = binary.slice(i, i + MAX_CHUNK_LENGTH);
      const isLastChunk = i + MAX_CHUNK_LENGTH < binary.length;
      if (isLastChunk) {
        const flags = Buffer.from([FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED, channelId]);
        messageChunks.push({ payload: Buffer.concat([flags, chunk]), trigger: terminatorSentTrigger });
      } else {
        const flags = Buffer.from([FLAG_SEGMENT_SEQ]);
        messageChunks.push({ payload: Buffer.concat([flags, chunk]) });
      }
    }

    const queuedMessages = this._outgoingMessageChunks.get(channelId);
    if (queuedMessages) {
      queuedMessages.push(...messageChunks);
    } else {
      this._outgoingMessageChunks.set(channelId, messageChunks);
    }

    this._sendChunkedMessages();

    return terminatorSentTrigger.wait();
  }

  public receiveData(data: Uint8Array): Message | undefined {
    if ((data[0] & FLAG_SEGMENT_SEQ) === 0) {
      return buf.fromBinary(MessageSchema, data.slice(1));
    }

    const [flags, channelId, ...payload] = data;
    let chunkAccumulator = this._incomingMessageAccumulator.get(channelId);
    if (chunkAccumulator) {
      chunkAccumulator.push(Buffer.from(payload));
    } else {
      chunkAccumulator = [Buffer.from(payload)];
      this._incomingMessageAccumulator.set(channelId, chunkAccumulator);
    }

    if ((flags & FLAG_SEGMENT_SEQ_TERMINATED) === 0) {
      return undefined;
    }

    const message = buf.fromBinary(MessageSchema, Buffer.concat(chunkAccumulator));
    this._incomingMessageAccumulator.delete(channelId);
    return message;
  }

  public destroy() {
    if (this._sendTimeout) {
      clearTimeout(this._sendTimeout);
      this._sendTimeout = undefined;
    }
    for (const channelChunks of this._outgoingMessageChunks.values()) {
      channelChunks.forEach((chunk) => chunk.trigger?.wake());
    }
    this._outgoingMessageChunks.clear();
    this._incomingMessageAccumulator.clear();
    this._serviceToChannel.clear();
  }

  private _sendChunkedMessages() {
    if (this._sendTimeout) {
      return;
    }

    const send = () => {
      if (this._ws.readyState === WebSocket.CLOSING || this._ws.readyState === WebSocket.CLOSED) {
        log.warn('send called for closed websocket');
        this._sendTimeout = undefined;
        return;
      }

      let timeout = 0;
      const emptyChannels: number[] = [];
      for (const [channelId, messages] of this._outgoingMessageChunks.entries()) {
        if (this._ws.bufferedAmount + MAX_CHUNK_LENGTH > MAX_BUFFERED_AMOUNT) {
          timeout = BUFFER_FULL_BACKOFF_TIMEOUT;
          break;
        }

        const nextMessage = messages.shift();
        if (nextMessage) {
          this._ws.send(nextMessage.payload);
          nextMessage.trigger?.wake();
        } else {
          emptyChannels.push(channelId);
        }
      }

      emptyChannels.forEach((channelId) => this._outgoingMessageChunks.delete(channelId));

      if (this._outgoingMessageChunks.size > 0) {
        this._sendTimeout = setTimeout(send, timeout);
      } else {
        this._sendTimeout = undefined;
      }
    };
    this._sendTimeout = setTimeout(send);
  }

  private _resolveChannel(message: Message): number | undefined {
    if (!message.serviceId) {
      return undefined;
    }
    let id = this._serviceToChannel.get(message.serviceId);
    if (!id) {
      id = this._serviceToChannel.size + 1;
      this._serviceToChannel.set(message.serviceId, id);
    }
    return id;
  }
}

type MessageChunk = {
  payload: Buffer;
  /**
   * Wakes when the payload is enqueued by WebSocket.
   */
  trigger?: Trigger;
};
