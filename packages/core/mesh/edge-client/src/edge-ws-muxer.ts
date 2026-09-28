//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { concatUint8Arrays } from '@dxos/util';

import { protocol } from './defs.ts';

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
const MAX_OUT_CHANNEL_ID = 255;
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
  /** Channels whose last sent segment left the receiver mid-sequence. */
  private readonly _outOpenSequences = new Set<number>();
  /**
   * Set once pending sends were dropped with a sequence still open at the receiver: the wire format has no abort, so
   * the receiver keeps those segments and would prepend them to the next sequence on that channel.
   */
  private _segmentedSendError: Error | undefined;

  /** Set while segments wait for the socket to open or its buffer to drain. */
  private _sendTimeout: ReturnType<typeof setTimeout> | undefined;

  private readonly _maxChunkLength: number;

  constructor(
    private readonly _ws: WebSocketCompat,
    config?: { maxChunkLength: number },
  ) {
    this._maxChunkLength = config?.maxChunkLength ?? MAX_CHUNK_LENGTH;
  }

  /**
   * Resolves once the socket has taken the whole message; segments wait only while the socket is connecting or its
   * buffer is full.
   * Rejects with {@link MessageTooLargeError} past the Cloudflare limit, and with {@link WebSocketClosedError} if the
   * socket is closing or closed, or starts closing or the muxer is destroyed while segments wait. A segmented send also
   * rejects with the error the socket's `send` throws. A close or a throw drops every queued segmented message, and
   * once a message was cut off mid-sequence every later segmented message rejects with that error.
   */
  public async send(message: Message): Promise<void> {
    const { frames, channelId } = this._encode(message);
    if (channelId == null) {
      this._ws.send(frames[0]);
      return;
    }
    if (this._segmentedSendError) {
      throw this._segmentedSendError;
    }

    log('muxer sending segmented message', {
      chunkCount: frames.length,
      channelId,
      serviceId: message.serviceId,
      payload: protocol.getPayloadType(message),
    });

    const terminatorSentTrigger = new Trigger();
    const messageChunks: MessageChunk[] = frames.map((payload, index) =>
      index === frames.length - 1 ? { payload, trigger: terminatorSentTrigger } : { payload },
    );

    const queuedMessages = this._outMessageChunks.get(channelId);
    if (queuedMessages) {
      queuedMessages.push(...messageChunks);
    } else {
      this._outMessageChunks.set(channelId, messageChunks);
    }

    this._sendChunkedMessages();

    await terminatorSentTrigger.wait();
    log.debug('muxer segmented message send enqueued', {
      chunkCount: frames.length,
      channelId,
      serviceId: message.serviceId,
    });
  }

  /**
   * Writes every frame of the message before returning, with no queue, timer or back-pressure: for a socket that takes
   * frames at once and throws once closed, such as workerd's. Throws where {@link send} rejects. Use it or `send` on a
   * muxer, not both, since its segments would cut into a sequence `send` has queued.
   */
  public sendSync(message: Message): void {
    for (const frame of this._encode(message).frames) {
      this._ws.send(frame);
    }
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
    this._rejectPendingSends(new WebSocketClosedError(this._ws.readyState));
    this._inMessageAccumulator.clear();
    this._inMessageAccumulatorBytes.clear();
    this._inMessageAccumulatedBytes = 0;
    this._outMessageChannelByService.clear();
  }

  /**
   * Splits a message into its wire frames: one whole frame, or segments on its service's channel, which is returned
   * only then. Throws on a closing or closed socket and past the Cloudflare limit.
   */
  private _encode(message: Message): { frames: Uint8Array[]; channelId?: number } {
    if (this._ws.readyState === WebSocket.CLOSING || this._ws.readyState === WebSocket.CLOSED) {
      throw new WebSocketClosedError(this._ws.readyState);
    }
    const binary = buf.toBinary(MessageSchema, message);
    const channelId = this._resolveChannel(message);
    const maxByteLength = channelId == null ? CLOUDFLARE_MESSAGE_MAX_BYTES : CLOUDFLARE_RPC_MAX_BYTES;
    if (binary.byteLength > maxByteLength) {
      throw new MessageTooLargeError({
        byteLength: binary.byteLength,
        maxByteLength,
        serviceId: message.serviceId,
        payload: protocol.getPayloadType(message),
      });
    }
    if (channelId == null || binary.byteLength < this._maxChunkLength) {
      return { frames: [concatUint8Arrays(new Uint8Array([0]), binary)] };
    }

    const frames: Uint8Array[] = [];
    for (let offset = 0; offset < binary.byteLength; offset += this._maxChunkLength) {
      const isLastChunk = offset + this._maxChunkLength >= binary.byteLength;
      const flags = isLastChunk ? FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED : FLAG_SEGMENT_SEQ;
      frames.push(
        concatUint8Arrays(new Uint8Array([flags, channelId]), binary.subarray(offset, offset + this._maxChunkLength)),
      );
    }
    return { frames, channelId };
  }

  private _dropAccumulator(channelId: number): void {
    this._inMessageAccumulatedBytes -= this._inMessageAccumulatorBytes.get(channelId) ?? 0;
    this._inMessageAccumulator.delete(channelId);
    this._inMessageAccumulatorBytes.delete(channelId);
  }

  /** Writes queued segments one per channel per round until none are left or the socket cannot take more. */
  private _sendChunkedMessages(): void {
    if (this._sendTimeout) {
      return;
    }

    while (this._outMessageChunks.size > 0) {
      for (const [channelId, chunks] of this._outMessageChunks) {
        const { readyState, bufferedAmount } = this._ws;
        if (readyState === WebSocket.CLOSING || readyState === WebSocket.CLOSED) {
          log.warn('muxer dropped queued segments (websocket closed)', {
            readyState,
            pendingChannels: this._outMessageChunks.size,
          });
          this._rejectPendingSends(new WebSocketClosedError(readyState));
          return;
        }
        // `send()` throws `InvalidStateError` before the handshake completes, and a full buffer is back-pressure.
        if (
          readyState === WebSocket.CONNECTING ||
          (bufferedAmount != null && bufferedAmount + MAX_CHUNK_LENGTH > MAX_BUFFERED_AMOUNT)
        ) {
          log.debug('muxer send paused', {
            readyState,
            bufferedAmount,
            pendingChannels: this._outMessageChunks.size,
          });
          this._sendTimeout = setTimeout(() => {
            this._sendTimeout = undefined;
            this._sendChunkedMessages();
          }, BUFFER_FULL_BACKOFF_TIMEOUT);
          return;
        }

        const chunk = chunks.shift();
        if (chunks.length === 0) {
          this._outMessageChunks.delete(channelId);
        }
        if (!chunk) {
          continue;
        }
        try {
          this._ws.send(chunk.payload);
        } catch (error) {
          log.warn('muxer failed to send segmented message chunk', { channelId, error });
          const sendError = error instanceof Error ? error : new Error(String(error));
          chunk.trigger?.throw(sendError);
          this._rejectPendingSends(sendError);
          return;
        }
        if ((chunk.payload[0] & FLAG_SEGMENT_SEQ_TERMINATED) === 0) {
          this._outOpenSequences.add(channelId);
        } else {
          this._outOpenSequences.delete(channelId);
        }
        chunk.trigger?.wake();
      }
    }
  }

  /** Rejects every queued segmented send and drops the chunks they had yet to send. */
  private _rejectPendingSends(error: Error): void {
    for (const channelChunks of this._outMessageChunks.values()) {
      channelChunks.forEach((chunk) => chunk.trigger?.throw(error));
    }
    this._outMessageChunks.clear();
    if (this._outOpenSequences.size > 0) {
      this._segmentedSendError ??= error;
      this._outOpenSequences.clear();
    }
  }

  private _resolveChannel(message: Message): number | undefined {
    if (!message.serviceId) {
      return undefined;
    }
    let id = this._outMessageChannelByService.get(message.serviceId);
    if (!id) {
      // Channel ids are one byte on the wire. Past that many services they are shared, which is safe because a
      // channel is a single queue: its services take turns rather than interleave segments.
      id = (this._outMessageChannelByService.size % MAX_OUT_CHANNEL_ID) + 1;
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

/**
 * Rejects a send on a closing or closed socket, or a segmented send whose remaining segments were dropped because the
 * socket began closing, or the muxer was destroyed, before they could be handed to it.
 */
export class WebSocketClosedError extends BaseError.extend(
  'WebSocketClosedError',
  'WebSocket closed before the message was sent.',
) {
  constructor(readyState: number) {
    super({ context: { readyState } });
  }
}

/**
 * Rejects a send past Cloudflare's limit: 1MB for a message sent whole, 32MB for a segmented one.
 */
export class MessageTooLargeError extends BaseError.extend('MessageTooLargeError', 'Message exceeds the size limit.') {
  constructor(context: { byteLength: number; maxByteLength: number; serviceId?: string; payload?: string }) {
    super({ context });
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
   * Wakes when the payload is enqueued by WebSocket, or throws if the socket fails or the muxer is destroyed first.
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
