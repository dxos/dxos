//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

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
 * https://developers.cloudflare.com/durable-objects/platform/limits/
 */
export const CLOUDFLARE_MESSAGE_MAX_BYTES = 1000 * 1000; // 1MB
export const CLOUDFLARE_RPC_MAX_BYTES = 32 * 1000 * 1000; // 32MB

const MAX_CHUNK_LENGTH = 16384;
const MAX_BUFFERED_AMOUNT = CLOUDFLARE_MESSAGE_MAX_BYTES;
const BUFFER_FULL_BACKOFF_TIMEOUT = 100;

export class WebSocketMuxer {
  private readonly _inMessageAccumulator = new Map<number, Buffer[]>();
  private readonly _outMessageChunks = new Map<number, MessageChunk[]>();
  private readonly _outMessageChannelByService = new Map<string, number>();

  private _sendTimeout: any | undefined;

  private readonly _maxChunkLength: number;

  constructor(
    private readonly _ws: WebSocketCompat,
    config?: { maxChunkLength: number },
  ) {
    this._maxChunkLength = config?.maxChunkLength ?? MAX_CHUNK_LENGTH;
  }

  /**
   * Resolves when all the message chunks get enqueued for sending.
   */
  public async send(message: Message): Promise<void> {
    const binary = buf.toBinary(MessageSchema, message);
    const channelId = this._resolveChannel(message);
    if (
      (channelId == null && binary.byteLength > CLOUDFLARE_MESSAGE_MAX_BYTES) ||
      binary.byteLength > CLOUDFLARE_RPC_MAX_BYTES
    ) {
      log.error('Large message dropped', {
        byteLength: binary.byteLength,
        serviceId: message.serviceId,
        payload: protocol.getPayloadType(message),
        channelId,
      });
      return;
    }

    if (channelId == null || binary.length < this._maxChunkLength) {
      const flags = Buffer.from([0]);
      this._ws.send(Buffer.concat([flags, binary]));
      return;
    }

    const terminatorSentTrigger = new Trigger();
    const messageChunks: MessageChunk[] = [];
    for (let i = 0; i < binary.length; i += this._maxChunkLength) {
      const chunk = binary.slice(i, i + this._maxChunkLength);
      const isLastChunk = i + this._maxChunkLength >= binary.length;
      if (isLastChunk) {
        const flags = Buffer.from([FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED, channelId]);
        messageChunks.push({ payload: Buffer.concat([flags, chunk]), trigger: terminatorSentTrigger });
      } else {
        const flags = Buffer.from([FLAG_SEGMENT_SEQ, channelId]);
        messageChunks.push({ payload: Buffer.concat([flags, chunk]) });
      }
    }

    const queuedMessages = this._outMessageChunks.get(channelId);
    if (queuedMessages) {
      queuedMessages.push(...messageChunks);
    } else {
      this._outMessageChunks.set(channelId, messageChunks);
    }

    this._sendChunkedMessages();

    return terminatorSentTrigger.wait();
  }

  public receiveData(data: Uint8Array): Message | undefined {
    if ((data[0] & FLAG_SEGMENT_SEQ) === 0) {
      return buf.fromBinary(MessageSchema, data.slice(1));
    }

    const [flags, channelId, ...payload] = data;
    let chunkAccumulator = this._inMessageAccumulator.get(channelId);
    if (chunkAccumulator) {
      chunkAccumulator.push(Buffer.from(payload));
    } else {
      chunkAccumulator = [Buffer.from(payload)];
      this._inMessageAccumulator.set(channelId, chunkAccumulator);
    }

    if ((flags & FLAG_SEGMENT_SEQ_TERMINATED) === 0) {
      return undefined;
    }

    const message = buf.fromBinary(MessageSchema, Buffer.concat(chunkAccumulator));
    this._inMessageAccumulator.delete(channelId);
    return message;
  }

  public destroy(): void {
    if (this._sendTimeout) {
      clearTimeout(this._sendTimeout);
      this._sendTimeout = undefined;
    }
    for (const channelChunks of this._outMessageChunks.values()) {
      channelChunks.forEach((chunk) => chunk.trigger?.wake());
    }
    this._outMessageChunks.clear();
    this._inMessageAccumulator.clear();
    this._outMessageChannelByService.clear();
  }

  private _sendChunkedMessages(): void {
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
      for (const [channelId, messages] of this._outMessageChunks.entries()) {
        if (this._ws.bufferedAmount != null) {
          if (this._ws.bufferedAmount + MAX_CHUNK_LENGTH > MAX_BUFFERED_AMOUNT) {
            timeout = BUFFER_FULL_BACKOFF_TIMEOUT;
            break;
          }
        }

        const nextMessage = messages.shift();
        if (nextMessage) {
          this._ws.send(nextMessage.payload);
          nextMessage.trigger?.wake();
        } else {
          emptyChannels.push(channelId);
        }
      }

      emptyChannels.forEach((channelId) => this._outMessageChunks.delete(channelId));

      if (this._outMessageChunks.size > 0) {
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
    let id = this._outMessageChannelByService.get(message.serviceId);
    if (!id) {
      id = this._outMessageChannelByService.size + 1;
      this._outMessageChannelByService.set(message.serviceId, id);
    }
    return id;
  }
}

type WebSocketCompat = {
  readonly readyState: number;
  /**
   * Not available in workerd.
   */
  bufferedAmount?: number;
  send(message: (ArrayBuffer | ArrayBufferView) | string): void;
};

type MessageChunk = {
  payload: Buffer;
  /**
   * Wakes when the payload is enqueued by WebSocket.
   */
  trigger?: Trigger;
};

/**
 * To avoid using isomorphic-ws on edge.
 */
enum WebSocket {
  CLOSING = 2,
  CLOSED = 3,
}
