//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { concatUint8Arrays } from '@dxos/util';

import { protocol } from './defs.ts';
import { EdgeConnectionClosedError } from './errors.ts';

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

/**
 * Nothing larger than the Cloudflare RPC limit can legitimately be reassembled, so a sequence
 * that exceeds it is either malformed or hostile.
 */
export const MAX_INBOUND_MESSAGE_BYTES = CLOUDFLARE_RPC_MAX_BYTES;
/**
 * Bounds the accumulator independently of the byte cap, which empty or tiny chunks never trip.
 * Generous enough for a peer chunking well below `MAX_CHUNK_LENGTH` (32MB / 16KB is ~2k chunks).
 */
export const MAX_INBOUND_CHUNK_COUNT = 65536;
/**
 * Bounds the muxer as a whole: the channel id is a byte, so a per-channel cap alone would
 * still allow 256 concurrently open sequences to pin their full quota.
 */
export const MAX_INBOUND_TOTAL_BYTES = 4 * CLOUDFLARE_RPC_MAX_BYTES;

export class WebSocketMuxer {
  private readonly _inMessageAccumulator = new Map<number, Uint8Array[]>();
  private readonly _inMessageAccumulatorBytes = new Map<number, number>();
  private _inMessageAccumulatedBytes = 0;
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
   * Rejects with {@link EdgeConnectionClosedError} if the socket closes before the last chunk is enqueued.
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
      this._ws.send(concatUint8Arrays(new Uint8Array([0]), binary));
      return;
    }

    const chunkCount = Math.ceil(binary.length / this._maxChunkLength);
    log('muxer sending segmented message', {
      byteLength: binary.byteLength,
      chunkCount,
      channelId,
      serviceId: message.serviceId,
      payload: protocol.getPayloadType(message),
    });

    const terminatorSentTrigger = new Trigger();
    const messageChunks: MessageChunk[] = [];
    for (let i = 0; i < binary.length; i += this._maxChunkLength) {
      const chunk = binary.slice(i, i + this._maxChunkLength);
      const isLastChunk = i + this._maxChunkLength >= binary.length;
      if (isLastChunk) {
        const flags = new Uint8Array([FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED, channelId]);
        messageChunks.push({ payload: concatUint8Arrays(flags, chunk), trigger: terminatorSentTrigger });
      } else {
        const flags = new Uint8Array([FLAG_SEGMENT_SEQ, channelId]);
        messageChunks.push({ payload: concatUint8Arrays(flags, chunk) });
      }
    }

    const queuedMessages = this._outMessageChunks.get(channelId);
    if (queuedMessages) {
      queuedMessages.push(...messageChunks);
    } else {
      this._outMessageChunks.set(channelId, messageChunks);
    }

    this._sendChunkedMessages();

    await terminatorSentTrigger.wait();
    log.debug('muxer segmented message send enqueued', {
      byteLength: binary.byteLength,
      chunkCount,
      channelId,
      serviceId: message.serviceId,
    });
  }

  public receiveData(data: Uint8Array): Message | undefined {
    if ((data[0] & FLAG_SEGMENT_SEQ) === 0) {
      return buf.fromBinary(MessageSchema, data.slice(1));
    }

    const flags = data[0];
    const channelId = data[1];
    // Measured before the copy, so an over-limit chunk is rejected without allocating it.
    const chunkLength = Math.max(0, data.byteLength - 2);
    let chunkAccumulator = this._inMessageAccumulator.get(channelId);

    // A first chunk is bounded like any other: an unchecked one would let a single oversized
    // segment, or a fresh channel opened once the aggregate is full, past the limits entirely.
    const chunkCount = (chunkAccumulator?.length ?? 0) + 1;
    const channelBytes = (this._inMessageAccumulatorBytes.get(channelId) ?? 0) + chunkLength;
    if (
      channelBytes > MAX_INBOUND_MESSAGE_BYTES ||
      chunkCount > MAX_INBOUND_CHUNK_COUNT ||
      this._inMessageAccumulatedBytes + chunkLength > MAX_INBOUND_TOTAL_BYTES
    ) {
      this._dropAccumulator(channelId);
      log.error('muxer dropped oversized segmented message', {
        channelId,
        chunkCount,
        byteLength: channelBytes,
        maxByteLength: MAX_INBOUND_MESSAGE_BYTES,
        maxChunkCount: MAX_INBOUND_CHUNK_COUNT,
        maxTotalByteLength: MAX_INBOUND_TOTAL_BYTES,
      });
      throw new SegmentedMessageLimitError(channelId, chunkCount, channelBytes);
    }

    const chunkPayload = data.slice(2);
    if (chunkAccumulator) {
      chunkAccumulator.push(chunkPayload);
    } else {
      chunkAccumulator = [chunkPayload];
      this._inMessageAccumulator.set(channelId, chunkAccumulator);
      log.debug('muxer started receiving segmented message', {
        channelId,
        firstChunkBytes: chunkLength,
      });
    }
    this._inMessageAccumulatorBytes.set(channelId, channelBytes);
    this._inMessageAccumulatedBytes += chunkLength;

    if ((flags & FLAG_SEGMENT_SEQ_TERMINATED) === 0) {
      return undefined;
    }

    const reassembled = concatUint8Arrays(chunkAccumulator);
    this._dropAccumulator(channelId);
    try {
      const message = buf.fromBinary(MessageSchema, reassembled);
      log('muxer reassembled segmented message', {
        channelId,
        chunkCount,
        byteLength: reassembled.byteLength,
        serviceId: message.serviceId,
        payloadBytes: message.payload?.value?.byteLength,
      });
      return message;
    } catch (error) {
      log.error('muxer failed to decode reassembled message', {
        channelId,
        chunkCount,
        byteLength: reassembled.byteLength,
        cause: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    this._inMessageAccumulatorBytes.clear();
    this._inMessageAccumulatedBytes = 0;
    this._outMessageChannelByService.clear();
  }

  private _dropAccumulator(channelId: number): void {
    this._inMessageAccumulatedBytes -= this._inMessageAccumulatorBytes.get(channelId) ?? 0;
    this._inMessageAccumulator.delete(channelId);
    this._inMessageAccumulatorBytes.delete(channelId);
  }

  private _sendChunkedMessages(): void {
    if (this._sendTimeout) {
      return;
    }

    const send = () => {
      if (this._ws.readyState === WebSocket.CONNECTING) {
        // `send()` throws `InvalidStateError` before the handshake completes, so wait it out.
        this._sendTimeout = setTimeout(send, BUFFER_FULL_BACKOFF_TIMEOUT);
        return;
      }
      if (this._ws.readyState === WebSocket.CLOSING || this._ws.readyState === WebSocket.CLOSED) {
        log.warn('send called for closed websocket', { pendingChannels: this._outMessageChunks.size });
        this._sendTimeout = undefined;
        this._rejectPendingSends(new EdgeConnectionClosedError());
        return;
      }

      let timeout = 0;
      const emptyChannels: number[] = [];
      for (const [channelId, messages] of this._outMessageChunks.entries()) {
        if (this._ws.bufferedAmount != null) {
          if (this._ws.bufferedAmount + MAX_CHUNK_LENGTH > MAX_BUFFERED_AMOUNT) {
            log.debug('muxer send paused (websocket buffer full)', {
              channelId,
              bufferedAmount: this._ws.bufferedAmount,
              pendingChannels: this._outMessageChunks.size,
            });
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

  /**
   * Settles every queued `send()` and drops its chunks, since nothing will be written to a closing socket.
   */
  private _rejectPendingSends(error: Error): void {
    for (const channelChunks of this._outMessageChunks.values()) {
      channelChunks.forEach((chunk) => chunk.trigger?.throw(error));
    }
    this._outMessageChunks.clear();
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

/**
 * Thrown when an inbound segment sequence exceeds the reassembly limits; the channel's
 * accumulator is released before the throw.
 */
export class SegmentedMessageLimitError extends Error {
  constructor(
    public readonly channelId: number,
    public readonly chunkCount: number,
    public readonly byteLength: number,
  ) {
    super(`Segmented message exceeded reassembly limits on channel ${channelId}.`);
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
  payload: Uint8Array;
  /**
   * Wakes when the payload is enqueued by WebSocket.
   */
  trigger?: Trigger;
};

/**
 * To avoid using isomorphic-ws on edge.
 */
enum WebSocket {
  CONNECTING = 0,
  CLOSING = 2,
  CLOSED = 3,
}
