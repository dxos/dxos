import { Duplex } from "node:stream";
import { Event } from "./events";
import { asyncTimeout } from "./timeout";

/**
 * Duplex stream for testing.
 * If this stream is piped into another stream, use `push` to send data, and `assertReceivedAsync` to assert the received data.
 */
export class TestStream extends Duplex {
  private _received = Buffer.alloc(0);
  private _onWrite = new Event();

  override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this._received = Buffer.concat([this._received, chunk]);
    this._onWrite.emit();
    callback();
  }

  override _read(size: number): void {
    // noop
  }

  assertReceivedAsync(data: Buffer | string, { timeout = 200 }: { timeout?: number } = {}) {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return asyncTimeout(this._onWrite.waitForCondition(() => this._received.equals(dataBuffer)), timeout);
  }
}