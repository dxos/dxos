//
// Copyright 2023 DXOS.org
//

import * as varint from 'varint';

import { type Trigger, Event } from '@dxos/async';
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

  addChannel(channel: number) {
    this._channels.push(channel);
  }

  async pushData(data: Uint8Array, trigger: Trigger, channelId: number) {
    const noCalls = this._sendBuffers.size === 0;

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

    // Start processing calls if this is the first call.
    if (noCalls) {
      try {
        await this._sendChunks();
      } catch (err: any) {
        log.catch(err);
      }
    }
  }

  destroy() {
    this._sendBuffers.clear();
    this._framer.destroy();
  }

  private _processIncomingMessage(msg: Uint8Array) {
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

  private _getNextCallerId() {
    if (this._sendBuffers.has(this._sysChannelId)) {
      return this._sysChannelId;
    }

    const index = this._lastCallerIndex;
    this._lastCallerIndex = (this._lastCallerIndex + 1) % this._channels.length;

    return this._channels[index];
  }

  private _getNextChunk(): ChunkEnvelope {
    let chunk;
    while (!chunk) {
      const channelId = this._getNextCallerId();
      const sendBuffer = this._sendBuffers.get(channelId);
      if (!sendBuffer) {
        continue;
      }

      chunk = sendBuffer.shift();
      if (sendBuffer.length === 0) {
        this._sendBuffers.delete(channelId);
      }
    }
    return chunk;
  }

  private async _sendChunks() {
    if (this._sendBuffers.size === 0) {
      return;
    }

    const chunk = this._getNextChunk();

    try {
      await this._framer.port.send(chunk.msg);
      chunk.trigger?.wake();
    } catch (err: any) {
      chunk.trigger?.throw(err);
    }

    await this._sendChunks();
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
