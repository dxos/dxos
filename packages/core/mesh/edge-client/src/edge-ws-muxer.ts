//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
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
 * 0000 0100 - credit grant, carrying no message. The body is a sequence of
 * `[channelId:u8][consumedBytes:u32 BE]` pairs; the repeat count is implicit in the frame length.
 *
 * Only ever sent when flow control was negotiated (`edge-ws-v2`): a V1 reader tests only
 * `FLAG_SEGMENT_SEQ`, so it would decode this as a message body and throw.
 */
const FLAG_FLOW_CONTROL = 1 << 2;

/** Bytes per `[channelId][consumedBytes]` pair in a credit grant frame. */
const GRANT_ENTRY_BYTES = 5;

/** Channel carrying messages with no service id, so they are accounted like everything else. */
const UNCHANNELLED_ID = 0;

/**
 * https://developers.cloudflare.com/durable-objects/platform/limits/
 */
export const CLOUDFLARE_MESSAGE_MAX_BYTES = 1000 * 1000; // 1MB
export const CLOUDFLARE_RPC_MAX_BYTES = 32 * 1000 * 1000; // 32MB

const MAX_CHUNK_LENGTH = 16384;
const MAX_BUFFERED_AMOUNT = CLOUDFLARE_MESSAGE_MAX_BYTES;
const BUFFER_FULL_BACKOFF_TIMEOUT = 100;

/** Multiple of the window a peer may overrun before the connection is treated as abusive. */
const DEFAULT_OVERDRAFT_TOLERANCE = 1.5;

export type FlowControlConfig = {
  /**
   * Credit window in payload bytes for the channel carrying `serviceId`.
   *
   * Sized from the bandwidth-delay product: below `throughput * RTT` the window itself caps
   * throughput, however fast either end is.
   */
  windowFor: (serviceId: string | undefined) => number;

  /**
   * Multiple of the window an inbound channel may overrun before {@link onOverdraft} fires.
   * Credits are advisory, so a receiver that must not fall over needs a bound that does not
   * depend on the peer cooperating. Tolerance absorbs frames the peer sent before a grant
   * reached it; it does not absorb a peer ignoring grants.
   */
  overdraftTolerance?: number;

  /** Peer overran its window. The owner decides what to do (the router closes the socket). */
  onOverdraft?: (info: { channelId: number; outstanding: number; window: number }) => void;
};

/** One inbound frame's contribution, as {@link WebSocketMuxer.receiveData} reports it. */
export type ReceivedFrame = {
  /** Undefined while a segmented message is still being assembled, or for a credit grant. */
  message?: Message;
  /**
   * Channel the frame arrived on, to be passed back to {@link WebSocketMuxer.consumed}.
   * Undefined for unchannelled frames (V0/V1 unsegmented) and for credit grants.
   */
  channelId?: number;
  /** Payload bytes this frame contributed, excluding the framing header. */
  byteLength: number;
};

export class WebSocketMuxer {
  private readonly _inMessageAccumulator = new Map<number, Uint8Array[]>();
  private readonly _outMessageChunks = new Map<number, MessageChunk[]>();
  private readonly _outMessageChannelByService = new Map<string, number>();

  private _sendTimeout: any | undefined;

  private readonly _maxChunkLength: number;
  private readonly _flowControl: FlowControlConfig | undefined;

  //
  // Flow control. Outbound state tracks what we may still send; inbound state tracks what we owe
  // the peer a grant for. The two are independent because channel ids are allocated unilaterally
  // by each sender, so the peer's channel 3 is unrelated to ours.
  //

  /** Per outbound channel: payload bytes handed to the socket. */
  private readonly _bytesSent = new Map<number, number>();
  /** Per outbound channel: the peer's last reported cumulative consumption. */
  private readonly _peerConsumed = new Map<number, number>();
  /** Per outbound channel: window in bytes, resolved once from the channel's service id. */
  private readonly _outWindow = new Map<number, number>();

  /** Per inbound channel: payload bytes received off the wire. */
  private readonly _inboundReceived = new Map<number, number>();
  /** Per inbound channel: payload bytes the application has reported consuming. */
  private readonly _inboundConsumed = new Map<number, number>();
  /** Per inbound channel: consumption total last announced, so grants are not emitted per message. */
  private readonly _inboundGranted = new Map<number, number>();
  /** Per inbound channel: window used for the grant threshold and the overdraft bound. */
  private readonly _inWindow = new Map<number, number>();

  constructor(
    private readonly _ws: WebSocketCompat,
    config?: { maxChunkLength?: number; flowControl?: FlowControlConfig },
  ) {
    this._maxChunkLength = config?.maxChunkLength ?? MAX_CHUNK_LENGTH;
    this._flowControl = config?.flowControl;
  }

  /** Whether credit-based flow control was negotiated for this connection. */
  public get flowControlEnabled(): boolean {
    return this._flowControl != null;
  }

  /**
   * Resolves when all the message chunks get enqueued for sending.
   */
  public async send(message: Message): Promise<void> {
    const binary = buf.toBinary(MessageSchema, message);
    // Under flow control every message is accounted, so a message with no service id rides the
    // reserved channel 0 rather than bypassing the queue; service channels are numbered from 1.
    const channelId = this._resolveChannel(message) ?? (this.flowControlEnabled ? UNCHANNELLED_ID : undefined);
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

    if (channelId != null) {
      this._ensureOutWindow(channelId, message.serviceId);
    }

    // Only reachable without flow control, which assigns every message a channel; the legacy
    // unsegmented path has no id to account against.
    if (channelId == null) {
      this._ws.send(concatUint8Arrays(new Uint8Array([0]), binary));
      return;
    }

    if (binary.length < this._maxChunkLength) {
      if (!this.flowControlEnabled) {
        this._ws.send(concatUint8Arrays(new Uint8Array([0]), binary));
        return;
      }
      // One terminated chunk rather than the unsegmented shape: a short message that skipped the
      // queue would evade the credit gate, and every message under 16KiB takes this path.
      const terminatorSentTrigger = new Trigger();
      const flags = new Uint8Array([FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED, channelId]);
      this._enqueueChunks(channelId, [
        { payload: concatUint8Arrays(flags, binary), payloadBytes: binary.length, trigger: terminatorSentTrigger },
      ]);
      await terminatorSentTrigger.wait();
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
        messageChunks.push({
          payload: concatUint8Arrays(flags, chunk),
          payloadBytes: chunk.length,
          trigger: terminatorSentTrigger,
        });
      } else {
        const flags = new Uint8Array([FLAG_SEGMENT_SEQ, channelId]);
        messageChunks.push({ payload: concatUint8Arrays(flags, chunk), payloadBytes: chunk.length });
      }
    }

    this._enqueueChunks(channelId, messageChunks);

    await terminatorSentTrigger.wait();
    log.debug('muxer segmented message send enqueued', {
      byteLength: binary.byteLength,
      chunkCount,
      channelId,
      serviceId: message.serviceId,
    });
  }

  public receiveData(data: Uint8Array): ReceivedFrame {
    if ((data[0] & FLAG_FLOW_CONTROL) !== 0) {
      this._applyGrants(data);
      return { byteLength: 0 };
    }

    if ((data[0] & FLAG_SEGMENT_SEQ) === 0) {
      // Only a pre-V2 peer sends this shape; under flow control every message is segment-framed so
      // that it carries a channel to account against.
      const body = data.slice(1);
      return { message: buf.fromBinary(MessageSchema, body), byteLength: body.length };
    }

    const [flags, channelId, ...payload] = data;
    const chunkPayload = new Uint8Array(payload);
    this._countInbound(channelId, chunkPayload.length);
    let chunkAccumulator = this._inMessageAccumulator.get(channelId);
    if (chunkAccumulator) {
      chunkAccumulator.push(chunkPayload);
    } else {
      chunkAccumulator = [chunkPayload];
      this._inMessageAccumulator.set(channelId, chunkAccumulator);
      log.debug('muxer started receiving segmented message', {
        channelId,
        firstChunkBytes: chunkPayload.byteLength,
      });
    }

    if ((flags & FLAG_SEGMENT_SEQ_TERMINATED) === 0) {
      return { channelId, byteLength: chunkPayload.length };
    }

    const reassembled = concatUint8Arrays(chunkAccumulator);
    const chunkCount = chunkAccumulator.length;
    this._inMessageAccumulator.delete(channelId);
    try {
      const message = buf.fromBinary(MessageSchema, reassembled);
      log('muxer reassembled segmented message', {
        channelId,
        chunkCount,
        byteLength: reassembled.byteLength,
        serviceId: message.serviceId,
        payloadBytes: message.payload?.value?.byteLength,
      });
      return { message, channelId, byteLength: chunkPayload.length };
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

  /**
   * Report that the application has finished with `byteLength` payload bytes on an inbound channel,
   * possibly emitting a credit grant.
   *
   * Must be called on consumption, never on receipt: crediting arrival would move the unbounded
   * buffer from the sender to the receiver rather than bounding it.
   */
  public consumed(channelId: number | undefined, byteLength: number): void {
    if (channelId == null || !this.flowControlEnabled) {
      return;
    }
    const consumed = ((this._inboundConsumed.get(channelId) ?? 0) + byteLength) >>> 0;
    this._inboundConsumed.set(channelId, consumed);

    const granted = this._inboundGranted.get(channelId) ?? 0;
    const freed = (consumed - granted) >>> 0;
    const window = this._inWindow.get(channelId) ?? this._maxChunkLength * 2;
    // Silly-window-syndrome avoidance: announcing every message would roughly double the frame
    // count on a download-heavy channel. Skipping a grant is free because they are cumulative --
    // the next one restates the total.
    if (freed < Math.max(Math.floor(window / 2), this._maxChunkLength)) {
      return;
    }
    this._inboundGranted.set(channelId, consumed);
    this._emitGrants(new Map([[channelId, consumed]]));
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
    this._bytesSent.clear();
    this._peerConsumed.clear();
    this._outWindow.clear();
    this._inboundReceived.clear();
    this._inboundConsumed.clear();
    this._inboundGranted.clear();
    this._inWindow.clear();
  }

  /**
   * Payload bytes queued for sending but not yet handed to the socket.
   *
   * Non-zero means this end is holding back -- under flow control, because a channel is out of
   * credit. It is the only externally visible sign that backpressure is being applied, so it is
   * what diagnostics and tests read.
   */
  public get pendingBytes(): number {
    let pending = 0;
    for (const chunks of this._outMessageChunks.values()) {
      for (const chunk of chunks) {
        pending += chunk.payloadBytes;
      }
    }
    return pending;
  }

  /**
   * Payload bytes handed to the socket that the peer has not reported consuming, across channels.
   *
   * Under flow control this is bounded by the sum of the channels' windows -- that bound IS the
   * backpressure. Without it nothing is ever acknowledged, so the figure only grows: it is the
   * measure of how far a client may run ahead of a router that cannot keep up.
   */
  public get unacknowledgedBytes(): number {
    let outstanding = 0;
    for (const channelId of this._bytesSent.keys()) {
      outstanding += this.inFlightBytes(channelId);
    }
    return outstanding;
  }

  /** Outbound bytes sent but not yet reported consumed, for tests and diagnostics. */
  public inFlightBytes(channelId: number): number {
    return ((this._bytesSent.get(channelId) ?? 0) - (this._peerConsumed.get(channelId) ?? 0)) >>> 0;
  }

  /** Channel a message would be sent on, for tests and for crediting a reply. */
  public channelFor(serviceId: string | undefined): number | undefined {
    return serviceId ? this._outMessageChannelByService.get(serviceId) : undefined;
  }

  private _enqueueChunks(channelId: number, chunks: MessageChunk[]): void {
    const queued = this._outMessageChunks.get(channelId);
    if (queued) {
      queued.push(...chunks);
    } else {
      this._outMessageChunks.set(channelId, chunks);
    }
    this._sendChunkedMessages();
  }

  private _ensureOutWindow(channelId: number, serviceId: string | undefined): void {
    if (!this._flowControl || this._outWindow.has(channelId)) {
      return;
    }
    // A window below two chunks cannot make progress: the grant threshold is at least one chunk,
    // so the sender would stall with the receiver never reaching the point of announcing.
    const window = Math.max(this._flowControl.windowFor(serviceId), this._maxChunkLength * 2);
    this._outWindow.set(channelId, window);
  }

  private _countInbound(channelId: number, byteLength: number): void {
    if (!this._flowControl) {
      return;
    }
    if (!this._inWindow.has(channelId)) {
      // The receiver does not know the peer's service id for a channel, so the inbound window is the
      // default. Both ends only have to agree that a window exists, not on its exact size: the
      // sender's window bounds what is in flight, and the receiver's only sets the grant cadence.
      this._inWindow.set(channelId, Math.max(this._flowControl.windowFor(undefined), this._maxChunkLength * 2));
    }
    const received = ((this._inboundReceived.get(channelId) ?? 0) + byteLength) >>> 0;
    this._inboundReceived.set(channelId, received);

    const outstanding = (received - (this._inboundConsumed.get(channelId) ?? 0)) >>> 0;
    const window = this._inWindow.get(channelId)!;
    const tolerance = this._flowControl.overdraftTolerance ?? DEFAULT_OVERDRAFT_TOLERANCE;
    if (outstanding > window * tolerance) {
      this._flowControl.onOverdraft?.({ channelId, outstanding, window });
    }
  }

  private _applyGrants(data: Uint8Array): void {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let offset = 1; offset + GRANT_ENTRY_BYTES <= data.length; offset += GRANT_ENTRY_BYTES) {
      const channelId = data[offset];
      const consumed = view.getUint32(offset + 1);
      this._peerConsumed.set(channelId, consumed);
    }
    // A grant is the only thing that can unblock a stalled channel, so resume immediately rather
    // than waiting for the next send.
    if (this._outMessageChunks.size > 0) {
      this._sendChunkedMessages();
    }
  }

  private _emitGrants(grants: Map<number, number>): void {
    if (this._ws.readyState === WebSocket.CLOSING || this._ws.readyState === WebSocket.CLOSED) {
      return;
    }
    const frame = new Uint8Array(1 + grants.size * GRANT_ENTRY_BYTES);
    const view = new DataView(frame.buffer);
    frame[0] = FLAG_FLOW_CONTROL;
    let offset = 1;
    for (const [channelId, consumed] of grants) {
      frame[offset] = channelId;
      view.setUint32(offset + 1, consumed >>> 0);
      offset += GRANT_ENTRY_BYTES;
    }
    // Sent directly rather than queued: a grant behind the backlog it exists to clear is a deadlock,
    // and so is a grant that is itself credit-gated on a saturated channel.
    this._ws.send(frame);
  }

  private _creditFor(channelId: number): number | undefined {
    if (!this._flowControl) {
      return undefined;
    }
    const window = this._outWindow.get(channelId);
    if (window == null) {
      return undefined;
    }
    return window - this.inFlightBytes(channelId);
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
      let sentAny = false;
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

        const nextMessage = messages[0];
        if (!nextMessage) {
          emptyChannels.push(channelId);
          continue;
        }

        const credit = this._creditFor(channelId);
        if (credit != null && credit < nextMessage.payloadBytes) {
          // Only this channel is blocked. The loop continues so the others keep flowing -- a
          // per-socket watermark is what lets a stalled sync block presence and invitations.
          log.debug('muxer channel stalled on credit', {
            channelId,
            credit,
            needed: nextMessage.payloadBytes,
            inFlight: this.inFlightBytes(channelId),
          });
          continue;
        }

        messages.shift();
        sentAny = true;
        this._ws.send(nextMessage.payload);
        this._bytesSent.set(channelId, ((this._bytesSent.get(channelId) ?? 0) + nextMessage.payloadBytes) >>> 0);
        nextMessage.trigger?.wake();
      }

      emptyChannels.forEach((channelId) => this._outMessageChunks.delete(channelId));

      this._sendTimeout = undefined;
      // Only when nothing moved at all is the queue genuinely credit-stalled, and then the peer's
      // grant wakes it rather than a timer -- otherwise this would spin for as long as the consumer
      // is slow. A pass that sent anything must reschedule, or channels behind a stalled one would
      // be stranded with it.
      if (this._outMessageChunks.size > 0 && (sentAny || timeout > 0)) {
        this._sendTimeout = setTimeout(send, timeout);
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
      // From 1: channel 0 is reserved for messages with no service id.
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
  payload: Uint8Array;
  /** Payload bytes excluding the framing header, which is what both ends account for credit. */
  payloadBytes: number;
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
