//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { concatUint8Arrays } from '@dxos/util';

import { type DuplexStream } from './duplex-stream.ts';
import { type RpcPort } from './rpc-port.ts';

const FRAME_LENGTH_SIZE = 2;

/**
 * Bytes the readable side queues before `send` starts reporting backpressure.
 * A byte-denominated strategy is what makes `desiredSize` an exact queued-byte count for stats.
 */
const READABLE_HIGH_WATER_MARK = 64 * 1024;

/**
 * Converts a stream of binary messages into a framed RpcPort.
 * Buffers are written prefixed by their length encoded as a varint.
 */
export class Framer {
  #messageCb?: (msg: Uint8Array) => void = undefined;
  #subscribeCb?: () => void = undefined;
  #buffer?: Uint8Array = undefined; // The rest of the bytes from the previous write call.
  #sendCallbacks: (() => void)[] = [];

  #bytesSent = 0;
  #bytesReceived = 0;

  #writable = true;
  #controller?: ReadableStreamDefaultController<Uint8Array> = undefined;
  #closed = false;

  readonly drain = new Event();

  /**
   * Emitted once when the pipe ends, carrying the error that ended it if there was one.
   * Replaces the `close` and `error` events of the Node stream this used to be.
   */
  readonly closed = new Event<Error | undefined>();

  readonly #readableStream = new ReadableStream<Uint8Array>(
    {
      start: (controller) => {
        this.#controller = controller;
      },
      // Called when the consumer is ready for more bytes; the queued senders may proceed.
      pull: () => {
        this.#processResponseQueue();
      },
      cancel: (reason) => {
        this.#handleClosed(reason);
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: READABLE_HIGH_WATER_MARK }),
  );

  readonly #writableStream = new WritableStream<Uint8Array>({
    write: (chunk) => {
      invariant(!this.#subscribeCb, 'Internal Framer bug. Concurrent writes detected.');

      this.#bytesReceived += chunk.length;
      this.#buffer = this.#buffer && this.#buffer.length > 0 ? concatUint8Arrays(this.#buffer, chunk) : chunk;

      if (this.#messageCb) {
        this.#popFrames();
        return;
      }

      // Defer completion until the peer subscribes, so the chunk is not dropped.
      return new Promise<void>((resolve) => {
        this.#subscribeCb = () => {
          this.#popFrames();
          this.#subscribeCb = undefined;
          resolve();
        };
      });
    },
    close: () => {
      this.#handleClosed(undefined);
    },
    abort: (reason) => {
      this.#handleClosed(reason);
    },
  });

  readonly port: RpcPort = {
    send: (message) => {
      return new Promise<void>((resolve, reject) => {
        if (this.#closed) {
          reject(new Error('Framer is closed.'));
          return;
        }

        const frame = encodeFrame(message);
        this.#bytesSent += frame.length;
        this.#controller!.enqueue(frame);
        // `desiredSize` is the web-stream spelling of the `push()` return value this used to check.
        this.#writable = (this.#controller!.desiredSize ?? 0) > 0;
        if (!this.#writable) {
          this.#sendCallbacks.push(resolve);
        } else {
          resolve();
        }
      });
    },
    subscribe: (callback) => {
      invariant(!this.#messageCb, 'Rpc port already has a message listener.');
      this.#messageCb = callback;
      this.#subscribeCb?.();
      return () => {
        this.#messageCb = undefined;
      };
    },
  };

  get stream(): DuplexStream {
    return { readable: this.#readableStream, writable: this.#writableStream };
  }

  get bytesSent(): number {
    return this.#bytesSent;
  }

  get bytesReceived(): number {
    return this.#bytesReceived;
  }

  get writable(): boolean {
    return this.#writable;
  }

  /**
   * Number of bytes queued in the readable side, awaiting the consumer.
   */
  get readableLength(): number {
    if (!this.#controller) {
      return 0;
    }
    return READABLE_HIGH_WATER_MARK - (this.#controller.desiredSize ?? READABLE_HIGH_WATER_MARK);
  }

  /**
   * Number of received bytes not yet consumed by a complete frame.
   */
  get writableLength(): number {
    return this.#buffer?.length ?? 0;
  }

  #processResponseQueue(): void {
    const responseQueue = this.#sendCallbacks;
    this.#sendCallbacks = [];
    this.#writable = true;
    this.drain.emit();
    responseQueue.forEach((cb) => cb());
  }

  #handleClosed(reason?: unknown): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    // Unblock anyone awaiting capacity, so a close cannot strand a pending send.
    this.#processResponseQueue();
    this.closed.emit(reason instanceof Error ? reason : undefined);
  }

  /**
   * Attempts to pop frames from the buffer and call the message callback.
   */
  #popFrames(): void {
    let offset = 0;
    while (offset < this.#buffer!.length) {
      const frame = decodeFrame(this.#buffer!, offset);

      if (!frame) {
        break; // Couldn't read frame but there are still bytes left in the buffer.
      }
      offset += frame.bytesConsumed;
      // TODO(dmaretskyi): Possible bug if the peer unsubscribes while we're reading frames.
      this.#messageCb!(frame.payload);
    }

    if (offset < this.#buffer!.length) {
      // Save the rest of the bytes for the next write call.
      this.#buffer = this.#buffer!.subarray(offset);
    } else {
      this.#buffer = undefined;
    }
  }

  destroy(): void {
    if (this.readableLength > 0) {
      log('framer destroyed while there are still read bytes in the buffer.');
    }
    if (this.writableLength > 0) {
      log.warn('framer destroyed while there are still write bytes in the buffer.');
    }

    if (!this.#closed) {
      try {
        this.#controller?.close();
      } catch {
        // Already closed or errored by the consumer; the close below is what matters.
      }
      this.#handleClosed(undefined);
    }
  }
}

/**
 * Attempts to read a frame from the input buffer.
 */
export const decodeFrame = (
  buffer: Uint8Array,
  offset: number,
): { payload: Uint8Array; bytesConsumed: number } | undefined => {
  if (buffer.length < offset + FRAME_LENGTH_SIZE) {
    // Not enough bytes to read the frame length.
    return undefined;
  }

  const frameLength = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getUint16(offset);
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

export const encodeFrame = (payload: Uint8Array): Uint8Array => {
  const frame = new Uint8Array(FRAME_LENGTH_SIZE + payload.length);
  new DataView(frame.buffer).setUint16(0, payload.length);
  frame.set(payload, FRAME_LENGTH_SIZE);
  return frame;
};
