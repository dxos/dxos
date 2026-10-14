//
// Copyright 2022 DXOS.org
//

import { Event } from './events.ts';
import { asyncTimeout } from './timeout.ts';

const encoder = new TextEncoder();

const toBytes = (data: Uint8Array | string): Uint8Array => (typeof data === 'string' ? encoder.encode(data) : data);

const concat = (first: Uint8Array, second: Uint8Array): Uint8Array => {
  const result = new Uint8Array(first.length + second.length);
  result.set(first);
  result.set(second, first.length);
  return result;
};

const equal = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length && first.every((byte, index) => byte === second[index]);

/**
 * Duplex byte stream for testing.
 * If this stream is connected to another stream, use `push` to send data, and `assertReceivedAsync` to assert the
 * received data.
 */
export class TestStream {
  static async assertConnectivity(
    stream1: TestStream,
    stream2: TestStream,
    { timeout = 200 }: { timeout?: number } = {},
  ): Promise<void> {
    stream1.push('ping');
    stream2.push('pong');

    await Promise.all([
      stream2.assertReceivedAsync('ping', { timeout }),
      stream1.assertReceivedAsync('pong', { timeout }),
    ]);
  }

  #controller!: ReadableStreamDefaultController<Uint8Array>;
  #received: Uint8Array = new Uint8Array(0);
  #onWrite = new Event();

  readonly readable = new ReadableStream<Uint8Array>({
    start: (controller) => {
      this.#controller = controller;
    },
  });

  readonly writable = new WritableStream<Uint8Array>({
    write: (chunk) => {
      this.#received = concat(this.#received, chunk);
      this.#onWrite.emit();
    },
  });

  push(data: Uint8Array | string): void {
    this.#controller.enqueue(toBytes(data));
  }

  assertReceivedAsync(data: Uint8Array | string, { timeout = 200 }: { timeout?: number } = {}): Promise<void> {
    const expected = toBytes(data);
    return asyncTimeout(
      this.#onWrite.waitForCondition(() => equal(this.#received, expected)),
      timeout,
    );
  }
}
