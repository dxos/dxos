//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { invariant } from '@dxos/invariant';

import { RpcPort } from './rpc-port';

const FRAME_LENGTH_SIZE = 2;

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
  private _sendCallbacks: (() => void)[] = [];

  private _bytesSent = 0;
  private _bytesReceived = 0;

  private readonly _stream = new Duplex({
    objectMode: false,
    read: () => {
      this._processResponseQueue();
    },
    write: (chunk, encoding, callback) => {
      invariant(!this._subscribeCb, 'Internal Framer bug. Concurrent writes detected.');

      this._bytesReceived += chunk.length;

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
        const frame = encodeFrame(message);
        this._bytesSent += frame.length;
        const canContinue = this._stream.push(frame);
        if (!canContinue) {
          this._sendCallbacks.push(resolve);
        } else {
          resolve();
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

  get stream(): Duplex {
    return this._stream;
  }

  get bytesSent() {
    return this._bytesSent;
  }

  get bytesReceived() {
    return this._bytesReceived;
  }

  private _processResponseQueue() {
    const responseQueue = this._sendCallbacks;
    this._sendCallbacks = [];
    responseQueue.forEach((cb) => cb());
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
    this._stream.destroy();
  }
}

/**
 * Attempts to read a frame from the input buffer.
 */
export const decodeFrame = (buffer: Buffer, offset: number): { payload: Buffer; bytesConsumed: number } | undefined => {
  if (buffer.length < offset + FRAME_LENGTH_SIZE) {
    // Not enough bytes to read the frame length.
    return undefined;
  }

  const frameLength = buffer.readUInt16BE(offset);
  const bytesConsumed = FRAME_LENGTH_SIZE + frameLength;

  if (buffer.length < offset + bytesConsumed) {
    // Not enough bytes to read the frame.
    return undefined;
  }

  const payload = buffer.subarray(offset + FRAME_LENGTH_SIZE, offset + bytesConsumed);

  return {
    payload,
    bytesConsumed,
  };
};

export const encodeFrame = (payload: Uint8Array): Buffer => {
  const frame = Buffer.allocUnsafe(FRAME_LENGTH_SIZE + payload.length);
  frame.writeUInt16BE(payload.length, 0);
  frame.set(payload, FRAME_LENGTH_SIZE);
  return frame;
};
