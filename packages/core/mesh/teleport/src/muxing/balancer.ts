//
// Copyright 2023 DXOS.org
//

import varint from 'varint';

import { type Trigger, Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { Framer } from './framer';

const MAX_CHUNK_SIZE = 8192;

type Chunk = {
  chunk: Uint8Array;
  channelId: number;
  dataLength?: number;
};

type ChunkEnvelope = {
  msg: Buffer;
  trigger?: Trigger;
};

type ChannelBuffer = {
  buffer: Buffer;
  msgLength: number;
};

/**
 * Load balancer for handling asynchronous calls from multiple channels.
 *
 * Manages a queue of calls from different channels and ensures that the calls
 * are processed in a balanced manner in a round-robin fashion.
 */
export class Balancer {
  private _lastCallerIndex = 0;
  private _channels: number[] = [];

  private readonly _framer = new Framer();
  // TODO(egorgripasov): Will cause a memory leak if channels do not appreciate the backpressure.
  private readonly _sendBuffers: Map<number, ChunkEnvelope[]> = new Map();
  private readonly _receiveBuffers = new Map<number, ChannelBuffer>();

  private _sending = false;
  public incomingData = new Event<Uint8Array>();
  public readonly stream = this._framer.stream;

  constructor(private readonly _sysChannelId: number) {
    this._channels.push(_sysChannelId);

    // Handle incoming messages.
    this._framer.port.subscribe(this._processIncomingMessage.bind(this));
  }

  get bytesSent() {
    return this._framer.bytesSent;
  }

  get bytesReceived() {
    return this._framer.bytesReceived;
  }

  get buffersCount() {
    return this._sendBuffers.size;
  }

  addChannel(channel: number): void {
    this._channels.push(channel);
  }

  pushData(data: Uint8Array, trigger: Trigger, channelId: number): void {
    this._enqueueChunk(data, trigger, channelId);
    this._sendChunks().catch((err) => log.catch(err));
  }

  destroy(): void {
    if (this._sendBuffers.size !== 0) {
      log.info('destroying balancer with pending calls');
    }
    this._sendBuffers.clear();
    this._framer.destroy();
  }

  private _processIncomingMessage(msg: Uint8Array): void {
    const { channelId, dataLength, chunk } = decodeChunk(msg, (channelId) => !this._receiveBuffers.has(channelId));
    if (!this._receiveBuffers.has(channelId)) {
      if (chunk.length < dataLength!) {
        this._receiveBuffers.set(channelId, {
          buffer: Buffer.from(chunk),
          msgLength: dataLength!,
        });
      } else {
        this.incomingData.emit(chunk);
      }
    } else {
      const channelBuffer = this._receiveBuffers.get(channelId)!;
      channelBuffer.buffer = Buffer.concat([channelBuffer.buffer, chunk]);
      if (channelBuffer.buffer.length < channelBuffer.msgLength) {
        return;
      }
      const msg = channelBuffer.buffer;
      this._receiveBuffers.delete(channelId);
      this.incomingData.emit(msg);
    }
  }

  private _getNextCallerId(): number {
    if (this._sendBuffers.has(this._sysChannelId)) {
      return this._sysChannelId;
    }

    const index = this._lastCallerIndex;
    this._lastCallerIndex = (this._lastCallerIndex + 1) % this._channels.length;

    return this._channels[index];
  }

  private _enqueueChunk(data: Uint8Array, trigger: Trigger, channelId: number): void {
    if (!this._channels.includes(channelId)) {
      throw new Error(`Unknown channel ${channelId}`);
    }

    if (!this._sendBuffers.has(channelId)) {
      this._sendBuffers.set(channelId, []);
    }

    const sendBuffer = this._sendBuffers.get(channelId)!;

    const chunks = [];
    for (let idx = 0; idx < data.length; idx += MAX_CHUNK_SIZE) {
      chunks.push(data.subarray(idx, idx + MAX_CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      const msg = encodeChunk({
        chunk,
        channelId,
        dataLength: index === 0 ? data.length : undefined,
      });
      sendBuffer.push({ msg, trigger: index === chunks.length - 1 ? trigger : undefined });
    });
  }

  // get the next chunk or null if there are no chunks remaining

  private _getNextChunk(): ChunkEnvelope | null {
    let chunk;
    while (this._sendBuffers.size > 0) {
      const channelId = this._getNextCallerId();
      const sendBuffer = this._sendBuffers.get(channelId);
      if (!sendBuffer) {
        continue;
      }

      chunk = sendBuffer.shift();
      if (!chunk) {
        continue;
      }
      if (sendBuffer.length === 0) {
        this._sendBuffers.delete(channelId);
      }
      return chunk;
    }
    return null;
  }

  private async _sendChunks(): Promise<void> {
    if (this._sending) {
      return;
    }
    this._sending = true;
    let chunk: ChunkEnvelope | null;
    chunk = this._getNextChunk();
    while (chunk) {
      // TODO(nf): determine whether this is needed since we await the chunk send
      if (!this._framer.writable) {
        log('PAUSE for drain');
        await this._framer.drain.waitForCount(1);
        log('RESUME for drain');
      }
      try {
        await this._framer.port.send(chunk.msg);
        chunk.trigger?.wake();
      } catch (err: any) {
        log('Error sending chunk', { err });
        chunk.trigger?.throw(err);
      }
      chunk = this._getNextChunk();
    }
    invariant(this._sendBuffers.size === 0, 'sendBuffers not empty');
    this._sending = false;
  }
}

export const encodeChunk = ({ channelId, dataLength, chunk }: Chunk): Buffer => {
  const channelTagLength = varint.encodingLength(channelId);
  const dataLengthLength = dataLength ? varint.encodingLength(dataLength) : 0;
  const message = Buffer.allocUnsafe(channelTagLength + dataLengthLength + chunk.length);
  varint.encode(channelId, message);
  if (dataLength) {
    varint.encode(dataLength, message, channelTagLength);
  }
  message.set(chunk, channelTagLength + dataLengthLength);
  return message;
};

export const decodeChunk = (data: Uint8Array, withLength: (channelId: number) => boolean): Chunk => {
  const channelId = varint.decode(data);
  let dataLength: number | undefined;
  let offset = varint.decode.bytes;

  if (withLength(channelId)) {
    dataLength = varint.decode(data, offset);
    offset += varint.decode.bytes;
  }

  const chunk = data.subarray(offset);

  return { channelId, dataLength, chunk };
};
