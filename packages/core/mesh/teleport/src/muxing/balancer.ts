//
// Copyright 2023 DXOS.org
//

import { Trigger, Event } from '@dxos/async';

import { Framer } from './framer';

const MAX_CHUNK_SIZE = 8192;

type Chunk = {
  msg: Buffer;
  trigger?: Trigger;
};

type ChannelBuffer = {
  buffer: Buffer;
  msgLength: number;
}

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
      // Buffer contains this in order:
      // - channel id
      // - data length - optional
      // - data
      const message = Buffer.from(msg.buffer, msg.byteOffset, msg.byteLength);
      const channelId = message.readInt32LE(0);

      if (!this._channelBuffers.has(channelId)) {
        const dataLength = message.readInt32LE(4);
        // Rest of the message is data.
        const data = message.slice(8);
        if (data.length < dataLength) {
          this._channelBuffers.set(channelId, {
            buffer: data,
            msgLength: dataLength,
          });
        } else {
          this.incomingData.emit(data);
        }
      } else {
        const channelBuffer = this._channelBuffers.get(channelId)!;
        const data = message.slice(4);
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

  pushChunk(msg: Uint8Array, trigger: Trigger, channelId: number) {
    const noCalls = this._calls.size === 0;

    if (!this._channels.includes(channelId)) {
      throw new Error(`Unknown channel ${channelId}`);
    }

    if (!this._calls.has(channelId)) {
      this._calls.set(channelId, []);
    }

    const channelCalls = this._calls.get(channelId)!;

    const data = Buffer.from(msg.buffer, msg.byteOffset, msg.byteLength);
    const chunks = [];
    for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
      chunks.push(data.slice(i, i + MAX_CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      const chunkTrigger = index === chunks.length - 1 ? trigger : undefined;

      // New buffer, which contains this in order:
      // - channel id
      // - data length - optional
      // - data
      let buffer;
      if (index === 0) {
        buffer = Buffer.alloc(4 + 4 + chunk.length);
        buffer.writeInt32LE(channelId, 0);
        buffer.writeInt32LE(data.length, 4);
        chunk.copy(buffer, 8);
      } else {
        buffer = Buffer.alloc(4 + chunk.length);
        buffer.writeInt32LE(channelId, 0);
        chunk.copy(buffer, 4);
      }
      channelCalls.push({ msg: buffer, trigger: chunkTrigger });
    });

    // Start processing calls if this is the first call.
    if (noCalls) {
      process.nextTick(async () => {
        await this._processCalls();
      });
    }
  }

  destroy() {
    this._framer.destroy();
    this._calls.clear();
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
