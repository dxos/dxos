//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Trigger, scheduleTask, sleepWithContext } from '@dxos/async';
import { Context } from '@dxos/context';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { EDGE_FLOW_CONTROL_MAX_MESSAGES, EDGE_FLOW_CONTROL_WINDOWS, edgeFlowControlWindow } from '@dxos/protocols';
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
 * 0000 0100 - flow-control frame, carrying no message. Alone it is a credit grant: a sequence of
 * `[channelId:u8][consumedBytes:u32 BE][consumedMessages:u32 BE]` entries, the receiver's cumulative consumption;
 * the repeat count is implicit in the frame length.
 *
 * Only ever sent when flow control was negotiated (`edge-ws-v2`): a V1 reader tests only `FLAG_SEGMENT_SEQ`, so it
 * would decode this as a message body and throw.
 */
const FLAG_FLOW_CONTROL = 1 << 2;
/**
 * 0000 1100 - sync: the sender's cumulative totals, `[channelId:u8][sentBytes:u32 BE][sentMessages:u32 BE]` for every
 * channel it has sent on, as of this point in the stream. A receiver rebuilt mid-connection (the router after
 * hibernation or a reset) has lost the totals its grants are counted against, and rebases onto these.
 */
const FLAG_SYNC = 1 << 3;
/** 0001 0100 - sync request, with no body: the receiver asks the sender for a {@link FLAG_SYNC} frame. */
const FLAG_SYNC_REQUEST = 1 << 4;

/** Bytes per `[channelId][bytes][messages]` entry in a grant or sync frame. */
const FLOW_CONTROL_ENTRY_BYTES = 9;

/**
 * How long a channel stays out of credit before the sender restates its totals unasked. A receiver that was reset
 * while this end was stalled never grants again, and with every channel stalled nothing else would wake it.
 */
const STALL_PROBE_INTERVAL = 5_000;

/** Channel carrying messages with no service id under flow control, so they are accounted like everything else. */
const UNCHANNELLED_ID = 0;

const isSegment = (frame: Uint8Array): boolean => (frame[0] & FLAG_SEGMENT_SEQ) !== 0;
const isTerminator = (frame: Uint8Array): boolean => (frame[0] & FLAG_SEGMENT_SEQ_TERMINATED) !== 0;

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

/** Multiple of the largest window a peer may overrun before the connection is treated as abusive. */
const OVERDRAFT_TOLERANCE = 1.5;

/** Bytes and messages, the two budgets every flow-control quantity is counted in. */
export type FlowControlAmount = { bytes: number; messages: number };

/**
 * Credit-based flow control for one connection; see `docs/design/flow-control/DESIGN.md` in dxos/edge.
 *
 * Both ends are bounded in bytes and in messages. Bytes bound memory and bandwidth; messages bound request count,
 * since the receiver dispatches every message downstream on its own (for a replicator, as one RPC into its Durable
 * Object) and a byte window alone admits thousands of small frames.
 */
export type FlowControlConfig = {
  /** Credit window in payload bytes for an outbound channel carrying `serviceId`. */
  windowFor: (serviceId: string | undefined) => number;

  /** Messages an outbound channel may have sent but not yet seen acknowledged. */
  maxMessages: number;

  /**
   * Consumption on an inbound channel worth announcing. Must stay below the smallest window and message bound the peer
   * sends with: grants are rate-limited, so a threshold the peer can never reach stalls it for good.
   */
  grantThreshold: FlowControlAmount;

  /**
   * Received-but-unconsumed amount on an inbound channel past which {@link onOverdraft} fires. Credits are advisory,
   * so a receiver that must not fall over needs a bound that does not depend on the peer cooperating.
   */
  overdraftLimit: FlowControlAmount;

  /** Peer overran its window. The owner decides what to do (the router closes the socket). */
  onOverdraft?: (info: { channelId: number; outstanding: FlowControlAmount; limit: FlowControlAmount }) => void;
};

/**
 * Flow control as `edge-ws-v2` specifies it, from the windows in `@dxos/protocols`; both ends of an EDGE socket use
 * this so their thresholds and bounds agree.
 */
export const createFlowControlConfig = (onOverdraft?: FlowControlConfig['onOverdraft']): FlowControlConfig => {
  const windows = Object.values(EDGE_FLOW_CONTROL_WINDOWS);
  return {
    windowFor: edgeFlowControlWindow,
    maxMessages: EDGE_FLOW_CONTROL_MAX_MESSAGES,
    // A quarter of the smallest budget, so even a swarm channel is announced well before its sender stalls.
    grantThreshold: {
      bytes: Math.floor(Math.min(...windows) / 4),
      messages: Math.max(1, Math.floor(EDGE_FLOW_CONTROL_MAX_MESSAGES / 4)),
    },
    // The receiver cannot tell an inbound channel's service, so it bounds every channel by the largest window.
    overdraftLimit: {
      bytes: Math.ceil(Math.max(...windows) * OVERDRAFT_TOLERANCE),
      messages: Math.ceil(EDGE_FLOW_CONTROL_MAX_MESSAGES * OVERDRAFT_TOLERANCE),
    },
    onOverdraft,
  };
};

/** One inbound frame's contribution, as {@link WebSocketMuxer.receiveFrame} reports it. */
export type ReceivedFrame = {
  /** Undefined while a segmented message is still being assembled, and for a credit grant. */
  message?: Message;
  /** Channel the frame arrived on. Undefined for unsegmented frames and credit grants, which carry no credit. */
  channelId?: number;
  /** Payload bytes this frame contributed, excluding the framing header. */
  byteLength: number;
};

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

  /** Disposed by {@link destroy}, which stops the send task mid-wait. */
  private readonly _ctx = new Context();
  /** Writes queued frames; one run at a time, and later schedules join the next run. */
  private readonly _sendTask = new DeferredTask(this._ctx, () => this._sendQueuedFrames());

  private readonly _maxChunkLength: number;
  private readonly _flowControl: FlowControlConfig | undefined;

  //
  // Flow control. Outbound state tracks what this end may still send; inbound state tracks what it owes the peer a
  // grant for. They are independent because each sender allocates channel ids on its own, so the peer's channel 3 is
  // unrelated to ours. Every total is cumulative mod 2^32, which keeps grants idempotent and resync-safe.
  //

  /** Per outbound channel: what has been handed to the socket. */
  private readonly _outSent = new Map<number, FlowControlAmount>();
  /** Per outbound channel: the peer's last reported cumulative consumption. */
  private readonly _outAcknowledged = new Map<number, FlowControlAmount>();
  /** Per outbound channel: window in bytes, resolved once from the first service on the channel. */
  private readonly _outWindow = new Map<number, number>();

  /** Per inbound channel: what arrived off the wire. */
  private readonly _inReceived = new Map<number, FlowControlAmount>();
  /** Per inbound channel: what the application reported consuming. */
  private readonly _inConsumed = new Map<number, FlowControlAmount>();
  /** Per inbound channel: consumption last announced, so a grant is not emitted per message. */
  private readonly _inGranted = new Map<number, FlowControlAmount>();
  /**
   * Whether the peer's sync has arrived. Until it has, this end cannot tell whether its totals start where the peer's
   * do (a new connection) or were lost mid-connection, so it withholds grants rather than send ones counted wrongly.
   */
  private _inSynced = false;
  private _stallProbeArmed = false;

  constructor(
    private readonly _ws: WebSocketCompat,
    config?: { maxChunkLength?: number; flowControl?: FlowControlConfig },
  ) {
    this._maxChunkLength = config?.maxChunkLength ?? MAX_CHUNK_LENGTH;
    this._flowControl = config?.flowControl;
    // A peer sending with this config stalls for good at a message bound the grant threshold never reaches.
    invariant(
      !this._flowControl ||
        (this._flowControl.maxMessages >= 1 &&
          this._flowControl.grantThreshold.messages <= this._flowControl.maxMessages),
      'Flow control needs a message bound the grant threshold can reach.',
    );
    if (this._flowControl) {
      this._sendControl(new Uint8Array([FLAG_FLOW_CONTROL | FLAG_SYNC_REQUEST]));
    }
  }

  /** Whether credit-based flow control was negotiated for this connection. */
  public get flowControlEnabled(): boolean {
    return this._flowControl != null;
  }

  /**
   * Resolves once the socket has taken the whole message. Segments go out on the send task, which writes as much as
   * the socket takes and waits only while it is connecting or its buffer is full; a message never overtakes one its
   * service sent before it. Under flow control a channel also waits for the peer's credit, and only that channel
   * waits: the others keep flowing.
   * Rejects with {@link MessageTooLargeError} past the Cloudflare limit, and with {@link WebSocketClosedError} if the
   * socket is closing or closed or the muxer is destroyed, including while the message waits. A queued message also
   * rejects with the error the socket's `send` throws. A close or a throw drops every queued message, and once a
   * message was cut off mid-sequence every later segmented message rejects with that error.
   */
  public async send(message: Message): Promise<void> {
    const { frames, channelId } = this._encode(message);
    const segmented = isSegment(frames[0]);
    if (segmented && this._segmentedSendError) {
      throw this._segmentedSendError;
    }
    const messageChunks: MessageChunk[] = frames.map((payload) => ({
      payload,
      payloadBytes: payloadBytesOf(payload),
    }));
    if (
      channelId === undefined ||
      (messageChunks.length === 1 &&
        (!segmented || this.flowControlEnabled) &&
        !this._outMessageChunks.has(channelId) &&
        this._canSend(channelId, messageChunks[0]))
    ) {
      this._write(channelId, messageChunks[0]);
      return;
    }

    log('muxer queueing message', {
      frameCount: frames.length,
      channelId,
      serviceId: message.serviceId,
      payload: protocol.getPayloadType(message),
    });

    const terminatorSentTrigger = new Trigger();
    messageChunks[messageChunks.length - 1].trigger = terminatorSentTrigger;
    const queuedMessages = this._outMessageChunks.get(channelId);
    if (queuedMessages) {
      queuedMessages.push(...messageChunks);
    } else {
      this._outMessageChunks.set(channelId, messageChunks);
    }

    this._sendTask.schedule();

    await terminatorSentTrigger.wait();
    log.debug('muxer queued message sent', {
      frameCount: frames.length,
      channelId,
      serviceId: message.serviceId,
    });
  }

  /**
   * Writes every frame of the message before returning, with no queue, timer or back-pressure.
   * Server only, such as the EDGE router on workerd: it holds the thread until the whole message is written, which a
   * server can afford but a client cannot, since its UI and sync work wait behind it. Clients use {@link send}, which
   * leaves the thread free and waits while the socket's buffer is full.
   * Not gated by credit either, since a caller holding the thread cannot wait for a grant; under flow control the
   * frames are still framed and counted per channel, so the peer's grants stay consistent.
   * Throws where {@link send} rejects, and on any message while `send` has messages queued, since its frames would cut
   * into them.
   */
  public sendSync(message: Message): void {
    invariant(this._outMessageChunks.size === 0, 'sendSync would cut into messages send has queued.');
    const { frames, channelId } = this._encode(message);
    if (isSegment(frames[0]) && this._segmentedSendError) {
      throw this._segmentedSendError;
    }
    for (const [index, frame] of frames.entries()) {
      try {
        this._write(channelId, { payload: frame, payloadBytes: payloadBytesOf(frame) });
      } catch (error) {
        // The receiver keeps the segments already written and would prepend them to the next sequence.
        if (index > 0) {
          this._segmentedSendError ??= error instanceof Error ? error : new Error(String(error));
        }
        throw error;
      }
    }
  }

  /**
   * Feeds one inbound frame, returning the message it completes, if any.
   * Under flow control use {@link receiveFrame} instead: nothing received here is ever credited back to the peer.
   */
  public receiveData(data: Uint8Array): Message | undefined {
    return this.receiveFrame(data).message;
  }

  /**
   * Feeds one inbound frame. The result is passed back to {@link consumed} once the application is done with it, which
   * is what extends the peer's credit. A frame the muxer itself discards (over the reassembly limits, or a sequence
   * that fails to decode) is credited here before the throw, so the sender is not left short of credit for it.
   */
  public receiveFrame(data: Uint8Array): ReceivedFrame {
    if ((data[0] & FLAG_FLOW_CONTROL) !== 0) {
      if ((data[0] & FLAG_SYNC_REQUEST) !== 0) {
        this._sendSync();
      } else if ((data[0] & FLAG_SYNC) !== 0) {
        this._applySync(data);
      } else {
        this._applyGrants(data);
      }
      return { byteLength: 0 };
    }

    if ((data[0] & FLAG_SEGMENT_SEQ) === 0) {
      // Only a pre-V2 peer sends this shape: under flow control every message is segment-framed, so that it carries a
      // channel to account against.
      return { message: buf.fromBinary(MessageSchema, data.slice(1)), byteLength: data.byteLength - 1 };
    }

    const flags = data[0];
    const channelId = data[1];
    const terminated = (flags & FLAG_SEGMENT_SEQ_TERMINATED) !== 0;
    // Measured before the copy, so an over-limit chunk is rejected without allocating it.
    const chunkLength = Math.max(0, data.byteLength - 2);
    const frame: ReceivedFrame = { channelId, byteLength: chunkLength };
    this._countInbound(channelId, chunkLength, terminated);
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
      this._consume(channelId, chunkLength, terminated ? 1 : 0);
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

    if (!terminated) {
      return frame;
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
      return { ...frame, message };
    } catch (error) {
      this._consume(channelId, chunkLength, 1);
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
   * Reports that the application is done with a frame {@link receiveFrame} returned, possibly emitting a credit grant.
   * Must be called on consumption, never on receipt: crediting arrival would move the unbounded buffer from the sender
   * to the receiver rather than bounding it. A frame the application drops still has to be reported, or its credit
   * is lost for the life of the connection.
   */
  public consumed(frame: ReceivedFrame): void {
    if (frame.channelId == null) {
      return;
    }
    this._consume(frame.channelId, frame.byteLength, frame.message ? 1 : 0);
  }

  public destroy(): void {
    void this._ctx.dispose();
    this._rejectPendingSends(new WebSocketClosedError(this._ws.readyState));
    this._inMessageAccumulator.clear();
    this._inMessageAccumulatorBytes.clear();
    this._inMessageAccumulatedBytes = 0;
    this._outMessageChannelByService.clear();
    this._outSent.clear();
    this._outAcknowledged.clear();
    this._outWindow.clear();
    this._inReceived.clear();
    this._inConsumed.clear();
    this._inGranted.clear();
  }

  /**
   * Payload bytes queued for sending but not yet handed to the socket.
   *
   * Under flow control, non-zero means a channel is out of credit and this end is holding back: the only externally
   * visible sign that backpressure is being applied, so it is what diagnostics and tests read.
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
   * Under flow control this is bounded by the sum of the channels' windows; that bound IS the backpressure. Without it
   * nothing is ever acknowledged, so the figure only grows: it measures how far this end has run ahead of the peer.
   */
  public get unacknowledgedBytes(): number {
    let outstanding = 0;
    for (const channelId of this._outSent.keys()) {
      outstanding += this.inFlight(channelId).bytes;
    }
    return outstanding;
  }

  /** What an outbound channel has sent that the peer has not yet reported consuming. */
  public inFlight(channelId: number): FlowControlAmount {
    return difference(this._outSent.get(channelId), this._outAcknowledged.get(channelId));
  }

  /** Channel a service's messages are sent on, once it has sent one. */
  public channelFor(serviceId: string | undefined): number | undefined {
    return serviceId ? this._outMessageChannelByService.get(serviceId) : undefined;
  }

  /**
   * Splits a message into its wire frames: one whole frame, or segments on its service's channel. Under flow control
   * every message is segment-framed, a message with no service id on the reserved channel 0, so no message evades the
   * credit gate. Returns the channel of any segmented message. Throws on a closing or closed socket, on a destroyed
   * muxer and past the Cloudflare limit.
   */
  private _encode(message: Message): { frames: Uint8Array[]; channelId: number | undefined } {
    if (this._ctx.disposed || this._ws.readyState === WebSocket.CLOSING || this._ws.readyState === WebSocket.CLOSED) {
      throw new WebSocketClosedError(this._ws.readyState);
    }
    const binary = buf.toBinary(MessageSchema, message);
    const channelId = this._resolveChannel(message) ?? (this._flowControl ? UNCHANNELLED_ID : undefined);
    if (channelId != null && this._flowControl && !this._outWindow.has(channelId)) {
      // Two chunks is the floor: below it the sender stalls on a chunk the window can never hold.
      this._outWindow.set(
        channelId,
        Math.max(this._flowControl.windowFor(message.serviceId), this._maxChunkLength * 2),
      );
    }
    // A message with no service id is relayed whole to peers that may not segment, so it keeps the single-frame limit.
    const maxByteLength = message.serviceId ? CLOUDFLARE_RPC_MAX_BYTES : CLOUDFLARE_MESSAGE_MAX_BYTES;
    if (binary.byteLength > maxByteLength) {
      throw new MessageTooLargeError({
        byteLength: binary.byteLength,
        maxByteLength,
        serviceId: message.serviceId,
        payload: protocol.getPayloadType(message),
      });
    }
    if (channelId == null || (!this.flowControlEnabled && binary.byteLength < this._maxChunkLength)) {
      return { frames: [concatUint8Arrays(new Uint8Array([0]), binary)], channelId };
    }

    const frames: Uint8Array[] = [];
    let offset = 0;
    do {
      const isLastChunk = offset + this._maxChunkLength >= binary.byteLength;
      const flags = isLastChunk ? FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED : FLAG_SEGMENT_SEQ;
      frames.push(
        concatUint8Arrays(new Uint8Array([flags, channelId]), binary.subarray(offset, offset + this._maxChunkLength)),
      );
      offset += this._maxChunkLength;
    } while (offset < binary.byteLength);
    return { frames, channelId };
  }

  private _dropAccumulator(channelId: number): void {
    this._inMessageAccumulatedBytes -= this._inMessageAccumulatorBytes.get(channelId) ?? 0;
    this._inMessageAccumulator.delete(channelId);
    this._inMessageAccumulatorBytes.delete(channelId);
  }

  /**
   * Writes queued frames one per channel per round until none are left, waiting while the socket is connecting or its
   * buffer is full. A channel out of credit is skipped so the rest keep flowing, and once every queued channel is out
   * of credit the run ends: the peer's grant schedules the next one. Stops at a closing socket or a throwing `send`,
   * rejecting every queued send.
   */
  private async _sendQueuedFrames(): Promise<void> {
    while (this._outMessageChunks.size > 0) {
      let progressed = false;
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
          await sleepWithContext(this._ctx, BUFFER_FULL_BACKOFF_TIMEOUT);
          progressed = true;
          break;
        }

        const chunk = chunks[0];
        if (!chunk) {
          this._outMessageChunks.delete(channelId);
          continue;
        }
        if (!this._canSend(channelId, chunk)) {
          log.debug('muxer channel stalled on credit', { channelId, inFlight: this.inFlight(channelId) });
          continue;
        }
        chunks.shift();
        if (chunks.length === 0) {
          this._outMessageChunks.delete(channelId);
        }
        try {
          this._write(channelId, chunk);
        } catch (error) {
          log.warn('muxer failed to send segmented message chunk', { channelId, error });
          const sendError = error instanceof Error ? error : new Error(String(error));
          chunk.trigger?.throw(sendError);
          this._rejectPendingSends(sendError);
          return;
        }
        progressed = true;
        chunk.trigger?.wake();
      }
      if (!progressed) {
        this._armStallProbe();
        return;
      }
    }
  }

  /** Hands one frame to the socket, keeping the open-sequence and credit accounting in step with what was written. */
  private _write(channelId: number | undefined, chunk: MessageChunk): void {
    this._ws.send(chunk.payload);
    if (channelId === undefined) {
      return;
    }
    const completesMessage = !isSegment(chunk.payload) || isTerminator(chunk.payload);
    if (isSegment(chunk.payload)) {
      if (completesMessage) {
        this._outOpenSequences.delete(channelId);
      } else {
        this._outOpenSequences.add(channelId);
      }
    }
    // Counted without flow control too, where nothing is ever acknowledged: the total then shows how far this end has
    // run ahead of its peer.
    this._outSent.set(
      channelId,
      sum(this._outSent.get(channelId), { bytes: chunk.payloadBytes, messages: completesMessage ? 1 : 0 }),
    );
  }

  /** Rejects every queued send and drops the frames they had yet to write. */
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

  /** Whether the channel's credit covers the chunk: its bytes, and a message slot if it completes a message. */
  private _canSend(channelId: number, chunk: MessageChunk): boolean {
    if (!this._flowControl) {
      return true;
    }
    const inFlight = this.inFlight(channelId);
    if (isTerminator(chunk.payload) && inFlight.messages >= this._flowControl.maxMessages) {
      return false;
    }
    return inFlight.bytes + chunk.payloadBytes <= (this._outWindow.get(channelId) ?? 0);
  }

  private _resolveChannel(message: Message): number | undefined {
    if (!message.serviceId) {
      return undefined;
    }
    let id = this._outMessageChannelByService.get(message.serviceId);
    if (!id) {
      // Channel ids are one byte on the wire. Past that many services they are shared, which is safe because a
      // channel is a single queue: its services take turns rather than interleave segments. Channel 0 is reserved
      // for messages with no service id.
      id = (this._outMessageChannelByService.size % MAX_OUT_CHANNEL_ID) + 1;
      this._outMessageChannelByService.set(message.serviceId, id);
    }
    return id;
  }

  private _countInbound(channelId: number, byteLength: number, terminated: boolean): void {
    if (!this._flowControl) {
      return;
    }
    const received = sum(this._inReceived.get(channelId), { bytes: byteLength, messages: terminated ? 1 : 0 });
    this._inReceived.set(channelId, received);
    const outstanding = difference(received, this._inConsumed.get(channelId));
    const limit = this._flowControl.overdraftLimit;
    if (outstanding.bytes > limit.bytes || outstanding.messages > limit.messages) {
      this._flowControl.onOverdraft?.({ channelId, outstanding, limit });
    }
  }

  private _consume(channelId: number, byteLength: number, messages: number): void {
    if (!this._flowControl) {
      return;
    }
    const consumed = sum(this._inConsumed.get(channelId), { bytes: byteLength, messages });
    this._inConsumed.set(channelId, consumed);
    if (!this._inSynced) {
      return;
    }

    // Silly-window-syndrome avoidance: announcing every message would roughly double the frame count on a busy
    // channel. Skipping a grant is free because they are cumulative: the next one restates the total.
    const freed = difference(consumed, this._inGranted.get(channelId));
    const threshold = this._flowControl.grantThreshold;
    if (freed.bytes < threshold.bytes && freed.messages < threshold.messages) {
      return;
    }
    this._grant([channelId]);
  }

  /** Announces the channels' consumption. Sent directly, never queued or credit-gated, either of which deadlocks. */
  private _grant(channelIds: number[]): void {
    const entries = channelIds.map((channelId): [number, FlowControlAmount] => {
      const consumed = this._inConsumed.get(channelId) ?? { bytes: 0, messages: 0 };
      this._inGranted.set(channelId, consumed);
      return [channelId, consumed];
    });
    this._sendControl(encodeFlowControl(FLAG_FLOW_CONTROL, entries));
  }

  /** States this end's cumulative totals for every channel it has sent on, ahead of anything it sends later. */
  private _sendSync(): void {
    this._sendControl(encodeFlowControl(FLAG_FLOW_CONTROL | FLAG_SYNC, [...this._outSent.entries()]));
  }

  private _sendControl(frame: Uint8Array): void {
    if (this._ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this._ws.send(frame);
    } catch (error) {
      // The socket is closing under us; the close handler tears this muxer down.
      log.verbose('muxer failed to send flow-control frame', { error });
    }
  }

  private _applyGrants(data: Uint8Array): void {
    for (const [channelId, consumed] of decodeFlowControl(data)) {
      this._outAcknowledged.set(channelId, consumed);
    }
    // A grant is the only thing that can unblock a stalled channel, so resume now rather than at the next send.
    if (this._outMessageChunks.size > 0) {
      this._sendTask.schedule();
    }
  }

  /**
   * Adopts the peer's totals as this end's baseline, the first time they arrive. Everything the peer sent before the
   * sync and this end never received was consumed, or lost with an earlier incarnation of this end, so it is counted
   * consumed; what arrived here and is still in hand stays outstanding. Later syncs, stall probes to a receiver that
   * still has its totals, are ignored.
   */
  private _applySync(data: Uint8Array): void {
    if (!this._flowControl || this._inSynced) {
      return;
    }
    this._inSynced = true;
    const channelIds: number[] = [];
    for (const [channelId, sent] of decodeFlowControl(data)) {
      const offset = difference(sent, this._inReceived.get(channelId));
      for (const totals of [this._inReceived, this._inConsumed]) {
        totals.set(channelId, sum(totals.get(channelId), offset));
      }
      channelIds.push(channelId);
    }
    // Granted at once whatever the threshold: the peer may be stalled on any of these channels.
    if (channelIds.length > 0) {
      this._grant(channelIds);
    }
  }

  private _armStallProbe(): void {
    if (!this._flowControl || this._stallProbeArmed) {
      return;
    }
    this._stallProbeArmed = true;
    scheduleTask(
      this._ctx,
      () => {
        this._stallProbeArmed = false;
        if (this._outMessageChunks.size > 0) {
          this._sendSync();
          // Re-checks credit, and re-arms the probe if the channel is still stalled.
          this._sendTask.schedule();
        }
      },
      STALL_PROBE_INTERVAL,
    );
  }
}

const encodeFlowControl = (flags: number, entries: Iterable<[number, FlowControlAmount]>): Uint8Array => {
  const list = [...entries];
  const frame = new Uint8Array(1 + list.length * FLOW_CONTROL_ENTRY_BYTES);
  const view = new DataView(frame.buffer);
  frame[0] = flags;
  list.forEach(([channelId, amount], index) => {
    const offset = 1 + index * FLOW_CONTROL_ENTRY_BYTES;
    frame[offset] = channelId;
    view.setUint32(offset + 1, amount.bytes);
    view.setUint32(offset + 5, amount.messages);
  });
  return frame;
};

const decodeFlowControl = (frame: Uint8Array): [number, FlowControlAmount][] => {
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const entries: [number, FlowControlAmount][] = [];
  for (let offset = 1; offset + FLOW_CONTROL_ENTRY_BYTES <= frame.byteLength; offset += FLOW_CONTROL_ENTRY_BYTES) {
    entries.push([frame[offset], { bytes: view.getUint32(offset + 1), messages: view.getUint32(offset + 5) }]);
  }
  return entries;
};

/** Payload bytes of a frame, excluding its framing header: what both ends account credit in. */
const payloadBytesOf = (frame: Uint8Array): number => frame.byteLength - (isSegment(frame) ? 2 : 1);

const sum = (total: FlowControlAmount | undefined, delta: FlowControlAmount): FlowControlAmount => ({
  bytes: ((total?.bytes ?? 0) + delta.bytes) >>> 0,
  messages: ((total?.messages ?? 0) + delta.messages) >>> 0,
});

/** `total - base` with unsigned wraparound, valid while the windows stay far below 2^31. */
const difference = (total: FlowControlAmount | undefined, base: FlowControlAmount | undefined): FlowControlAmount => ({
  bytes: ((total?.bytes ?? 0) - (base?.bytes ?? 0)) >>> 0,
  messages: ((total?.messages ?? 0) - (base?.messages ?? 0)) >>> 0,
});

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
 * Rejects a send on a closing or closed socket or a destroyed muxer, or a queued send whose remaining frames were
 * dropped because the socket began closing, or the muxer was destroyed, before they could be handed to it.
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

/** A frame in a channel's queue: a segment, or a whole message waiting behind its service's segments. */
type MessageChunk = {
  payload: Uint8Array;
  /** Payload bytes excluding the framing header, which is what both ends account credit in. */
  payloadBytes: number;
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
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
