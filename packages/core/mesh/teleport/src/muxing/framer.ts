//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';
import invariant from 'tiny-invariant';
import * as varint from 'varint';

import { log } from '@dxos/log';

import { RpcPort } from './rpc-port';

const MAX_CHUNK_SIZE = 8192;

type Chunk = {
  msg: Buffer;
  callback?: () => void;
};

/**
 * Framer that turns a stream of binary messages into a framed RpcPort.
 *
 * Buffers are written prefixed by their length encoded as a varint.
 */
export class Framer {
  // private readonly _tagBuffer = Buffer.alloc(4)
  private _messageCb?: (msg: Uint8Array) => void;
  private _subscribeCb?: () => void;
  private _buffer?: Buffer; // The rest of the bytes from the previous write call.

  // TODO(egorgripasov): Will cause a memory leak if streams do not appreciate the backpressure.
  private _chunkQueue: Chunk[] = [];

  private readonly _stream = new Duplex({
    objectMode: false,
    read: () => {},
    write: (chunk, encoding, callback) => {
      invariant(!this._subscribeCb, 'Internal Framer bug. Concurrent writes detected.');

      if (this._buffer && this._buffer.length > 0) {
        this._buffer = Buffer.concat([this._buffer, chunk]);
      } else {
        this._buffer = chunk;
      }

      if (this._messageCb) {
        this._popFrames();
        callback();
      } else {
        this._subscribeCb = () => {
          // Schedule the processing of the chunk after the peer subscribes to the messages.
          this._popFrames();
          this._subscribeCb = undefined;
          callback();
        };
      }
    },
  });

  public readonly port: RpcPort = {
    send: (message) => {
      // log('write', { len: message.length, frame: Buffer.from(message).toString('hex') })
      return new Promise<void>((resolve) => {
        const isEmpty = this._chunkQueue.length === 0;
        const data = encodeFrame(message);

        const chunks = [];
        for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
          chunks.push(data.slice(i, i + MAX_CHUNK_SIZE));
        }
        chunks.forEach((chunk, index) => {
          const callback = index === chunks.length - 1 ? resolve : undefined;
          this._chunkQueue.push({ msg: chunk, callback });
        });
        if (isEmpty) {
          this._processChunkQueue().catch(log.catch);
        }
      });
    },
    subscribe: (callback) => {
      invariant(!this._messageCb, 'Rpc port already has a message listener.');
      this._messageCb = callback;
      this._subscribeCb?.();
      return () => {
        this._messageCb = undefined;
      };
    },
  };

  private async _processChunkQueue() {
    if (this._chunkQueue.length === 0) {
      return;
    }

    const chunk = this._chunkQueue.shift()!;
    await this._sendData(chunk.msg);
    chunk.callback?.();

    await this._processChunkQueue();
  }

  private async _sendData(data: Buffer) {
    return new Promise<void>((resolve) => {
      const canContinue = this._stream.push(data);
      if (!canContinue) {
        this._stream.once('drain', resolve);
      } else {
        process.nextTick(resolve);
      }
    });
  }

  get stream(): Duplex {
    return this._stream;
  }

  /**
   * Attempts to pop frames from the buffer and call the message callback.
   */
  private _popFrames() {
    let offset = 0;
    while (offset < this._buffer!.length) {
      const frame = decodeFrame(this._buffer!, offset);

      if (!frame) {
        break; // Couldn't read frame but there are still bytes left in the buffer.
      }
      offset += frame.bytesConsumed;
      // TODO(dmaretskyi): Possible bug if the peer unsubscribes while we're reading frames.
      // log('read', { len: frame.payload.length, frame: Buffer.from(frame.payload).toString('hex') })
      this._messageCb!(frame.payload);
    }

    if (offset < this._buffer!.length) {
      // Save the rest of the bytes for the next write call.
      this._buffer = this._buffer!.subarray(offset);
    } else {
      this._buffer = undefined;
    }
  }

  destroy() {
    // TODO(dmaretskyi): Call stream.end() instead?
    this._stream.removeAllListeners('drain');
    this._stream.destroy();
  }
}

/**
 * Attempts to read a frame from the input buffer.
 */
export const decodeFrame = (buffer: Buffer, offset: number): { payload: Buffer; bytesConsumed: number } | undefined => {
  try {
    const frameLength = varint.decode(buffer, offset);
    const tagLength = varint.decode.bytes;

    if (buffer.length < offset + tagLength + frameLength) {
      // Not enough bytes to read the frame.
      return undefined;
    }

    const payload = buffer.subarray(offset + tagLength, offset + tagLength + frameLength);

    return {
      payload,
      bytesConsumed: tagLength + frameLength,
    };
  } catch (err) {
    if (err instanceof RangeError) {
      // Not enough bytes to read the tag.
      return undefined;
    } else {
      throw err;
    }
  }
};

export const encodeFrame = (payload: Uint8Array): Buffer => {
  const tagLength = varint.encodingLength(payload.length);
  const frame = Buffer.allocUnsafe(tagLength + payload.length);
  varint.encode(payload.length, frame);
  frame.set(payload, tagLength);
  return frame;
};
