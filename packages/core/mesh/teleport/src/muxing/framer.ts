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

/** Largest payload a 16-bit length prefix can describe. */
const MAX_FRAME_PAYLOAD = 0xffff;

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
  #pendingWriteResolve?: () => void = undefined;
  #buffer?: Uint8Array = undefined; // The rest of the bytes from the previous write call.
  #sendCallbacks: { resolve: () => void; reject: (err: Error) => void }[] = [];

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
        this.#pendingWriteResolve = resolve;
        this.#subscribeCb = () => {
          this.#popFrames();
          this.#settlePendingWrite();
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

        const controller = this.#controller;
        invariant(controller, 'Framer readable not started.');

        const frame = encodeFrame(message);
        this.#bytesSent += frame.length;
        controller.enqueue(frame);
        this.#writable = (controller.desiredSize ?? 0) > 0;
        if (!this.#writable) {
          this.#sendCallbacks.push({ resolve, reject });
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

  get isClosed(): boolean {
    return this.#closed;
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

  /**
   * Completes the write parked in `#writableStream` and clears the hooks that were waiting on it.
   */
  #settlePendingWrite(): void {
    this.#subscribeCb = undefined;
    const resolve = this.#pendingWriteResolve;
    this.#pendingWriteResolve = undefined;
    resolve?.();
  }

  #processResponseQueue(): void {
    const responseQueue = this.#sendCallbacks;
    this.#sendCallbacks = [];
    this.#writable = true;
    this.drain.emit();
    responseQueue.forEach(({ resolve }) => resolve());
  }

  /**
   * Fails every send still waiting for capacity. Resolving them instead would tell the sender its
   * bytes were accepted when the pipe carrying them is already gone.
   *
   * Stays `writable` and still emits `drain`: the readable is closed by now, so `pull` can never
   * run again, and a sender parked on `drain` would wait for an event that cannot arrive. Its next
   * `send` rejects immediately instead.
   */
  #failResponseQueue(reason?: unknown): void {
    const responseQueue = this.#sendCallbacks;
    this.#sendCallbacks = [];
    this.#writable = true;
    this.drain.emit();
    const error = reason instanceof Error ? reason : new Error('Framer is closed.');
    responseQueue.forEach(({ reject }) => reject(error));
  }

  #handleClosed(reason?: unknown): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    // End the readable too: a close arriving from the writable side otherwise leaves it open, and
    // whatever is piping out of it never completes.
    this.#closeController(reason);
    // Fail anyone awaiting capacity rather than strand them.
    this.#failResponseQueue(reason);
    // Settle a write parked waiting for a subscriber: nothing will consume it now, and leaving the
    // promise pending strands the `pipeTo` feeding us, which in turn hangs the transport's close.
    this.#settlePendingWrite();
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

  #closeController(reason?: unknown): void {
    try {
      if (reason instanceof Error) {
        this.#controller?.error(reason);
      } else {
        this.#controller?.close();
      }
    } catch {
      // Already closed, errored or cancelled by the consumer; nothing left to end.
    }
  }

  destroy(): void {
    if (this.readableLength > 0) {
      log('framer destroyed while there are still read bytes in the buffer.');
    }
    if (this.writableLength > 0) {
      log.warn('framer destroyed while there are still write bytes in the buffer.');
    }

    this.#handleClosed(undefined);
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
  if (payload.length > MAX_FRAME_PAYLOAD) {
    // `setUint16` would wrap, and the peer would read the overflow as further frames — silently
    // desynchronising the stream rather than failing here.
    throw new RangeError(`Frame payload exceeds ${MAX_FRAME_PAYLOAD} bytes: ${payload.length}.`);
  }

  const frame = new Uint8Array(FRAME_LENGTH_SIZE + payload.length);
  new DataView(frame.buffer).setUint16(0, payload.length);
  frame.set(payload, FRAME_LENGTH_SIZE);
  return frame;
};
