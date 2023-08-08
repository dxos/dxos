//
// Copyright 2023 DXOS.org
//

import * as varint from 'varint';

import { Trigger, Event } from '@dxos/async';
import { log } from '@dxos/log';

import { Framer } from './framer';

const MAX_CHUNK_SIZE = 4096;

type Chunk = {
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
  private readonly _calls: Map<number, Chunk[]> = new Map();
  private readonly _channelBuffers = new Map<number, ChannelBuffer>();

  public incomingData = new Event<Uint8Array>();
  public readonly stream = this._framer.stream;

  constructor(private readonly _sysChannelId: number) {
    this._channels.push(_sysChannelId);

    // Handle incoming messages.
    this._framer.port.subscribe(async (msg) => {
      const message = Buffer.from(msg.buffer, msg.byteOffset, msg.byteLength);
      const { channelId, dataLength, data } = decodeChunk(message, (channelId) => !this._channelBuffers.has(channelId));
      if (!this._channelBuffers.has(channelId)) {
        if (data.length < dataLength!) {
          this._channelBuffers.set(channelId, {
            buffer: data,
            msgLength: dataLength!,
          });
        } else {
          this.incomingData.emit(data);
        }
      } else {
        const channelBuffer = this._channelBuffers.get(channelId)!;
        channelBuffer.buffer = Buffer.concat([channelBuffer.buffer, data]);
        if (channelBuffer.buffer.length < channelBuffer.msgLength) {
          return;
        }
        const msg = channelBuffer.buffer;
        this._channelBuffers.delete(channelId);
        this.incomingData.emit(msg);
      }
    });
  }

  addChannel(channel: number) {
    this._channels.push(channel);
  }

  pushData(data: Uint8Array, trigger: Trigger, channelId: number) {
    const noCalls = this._calls.size === 0;

    if (!this._channels.includes(channelId)) {
      throw new Error(`Unknown channel ${channelId}`);
    }

    if (!this._calls.has(channelId)) {
      this._calls.set(channelId, []);
    }

    const channelCalls = this._calls.get(channelId)!;

    const chunks = [];
    for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
      chunks.push(data.subarray(i, i + MAX_CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      const msg = encodeChunk(chunk, channelId, index === 0 ? data.length : undefined);
      channelCalls.push({ msg, trigger: index === chunks.length - 1 ? trigger : undefined });
    });

    // Start processing calls if this is the first call.
    if (noCalls) {
      this._processCalls().catch((err) => log.catch(err));
    }
  }

  destroy() {
    this._calls.clear();
    this._framer.destroy();
  }

  private _getNextCallerId() {
    if (this._calls.has(this._sysChannelId)) {
      return this._sysChannelId;
    }

    const index = this._lastCallerIndex;
    this._lastCallerIndex = (this._lastCallerIndex + 1) % this._channels.length;

    return this._channels[index];
  }

  private _getNextCall(): Chunk {
    let call;
    while (!call) {
      const channelId = this._getNextCallerId();
      const channelCalls = this._calls.get(channelId);
      if (!channelCalls) {
        continue;
      }

      call = channelCalls.shift();
      if (channelCalls.length === 0) {
        this._calls.delete(channelId);
      }
    }
    return call;
  }

  private async _processCalls() {
    if (this._calls.size === 0) {
      return;
    }

    const call = this._getNextCall();

    try {
      await this._framer.port.send(call.msg);
      call.trigger?.wake();
    } catch (err: any) {
      call.trigger?.throw(err);
    }

    await this._processCalls();
  }
}

export const encodeChunk = (chunk: Uint8Array, channelId: number, dataLength?: number): Buffer => {
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

export const decodeChunk = (
  buffer: Buffer,
  withLength: (channelId: number) => boolean,
): { channelId: number; dataLength?: number; data: Buffer } => {
  const channelId = varint.decode(buffer);
  let dataLength;
  let offset = varint.decode.bytes;

  if (withLength(channelId)) {
    dataLength = varint.decode(buffer, offset);
    offset += varint.decode.bytes;
  }

  const data = buffer.slice(offset);

  return { channelId, dataLength, data };
};
