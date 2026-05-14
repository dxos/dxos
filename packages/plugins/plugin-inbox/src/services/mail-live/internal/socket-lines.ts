//
// Copyright 2026 DXOS.org
//

// @ts-ignore — cloudflare:sockets is a Workers built-in; types come from @cloudflare/workers-types.
import { connect, type Socket } from 'cloudflare:sockets';

export type SecureTransport = 'on' | 'starttls';

export interface SocketLinesOptions {
  hostname: string;
  port: number;
  secureTransport: SecureTransport;
}

const CR = 0x0d;
const LF = 0x0a;

/**
 * Line-oriented wrapper over `cloudflare:sockets`. Buffers TCP chunks and exposes
 * `readLine()` (CRLF-aware) + `readBytes(n)` (literal-aware) primitives. Shared
 * substrate for the IMAP and SMTP clients.
 */
export class SocketLines {
  #socket: Socket;
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #writer: WritableStreamDefaultWriter<Uint8Array>;
  #buf: Uint8Array = new Uint8Array(0);
  #encoder = new TextEncoder();
  #decoder = new TextDecoder();
  #host: string;
  #closed = false;

  private constructor(socket: Socket, host: string) {
    this.#socket = socket;
    this.#host = host;
    this.#reader = socket.readable.getReader();
    this.#writer = socket.writable.getWriter();
  }

  static open(opts: SocketLinesOptions): SocketLines {
    const sock = connect(
      { hostname: opts.hostname, port: opts.port },
      { secureTransport: opts.secureTransport, allowHalfOpen: false },
    );
    return new SocketLines(sock, opts.hostname);
  }

  /** Upgrade plain socket to TLS. Socket must have been opened with secureTransport: 'starttls'. */
  startTls(): void {
    this.#reader.releaseLock();
    this.#writer.releaseLock();
    const tls = this.#socket.startTls({ expectedServerHostname: this.#host });
    this.#socket = tls;
    this.#reader = tls.readable.getReader();
    this.#writer = tls.writable.getWriter();
    this.#buf = new Uint8Array(0);
  }

  async write(data: string | Uint8Array): Promise<void> {
    const bytes = typeof data === 'string' ? this.#encoder.encode(data) : data;
    await this.#writer.write(bytes);
  }

  /** Read until next CRLF. Returns the line WITHOUT CRLF. */
  async readLine(): Promise<string> {
    while (true) {
      const idx = this.#indexOfCrlf();
      if (idx >= 0) {
        const line = this.#decoder.decode(this.#buf.subarray(0, idx));
        this.#buf = this.#buf.slice(idx + 2);
        return line;
      }
      await this.#pull();
    }
  }

  /** Read exactly n bytes (used for IMAP literals). */
  async readBytes(n: number): Promise<Uint8Array> {
    while (this.#buf.length < n) {
      await this.#pull();
    }
    const out = this.#buf.slice(0, n);
    this.#buf = this.#buf.slice(n);
    return out;
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    try {
      this.#reader.releaseLock();
    } catch {}
    try {
      this.#writer.releaseLock();
    } catch {}
    try {
      await this.#socket.close();
    } catch {}
  }

  #indexOfCrlf(): number {
    for (let i = 0; i + 1 < this.#buf.length; i++) {
      if (this.#buf[i] === CR && this.#buf[i + 1] === LF) {
        return i;
      }
    }
    return -1;
  }

  async #pull(): Promise<void> {
    const { value, done } = await this.#reader.read();
    if (done || !value) {
      throw new Error('Socket closed unexpectedly');
    }
    const merged = new Uint8Array(this.#buf.length + value.length);
    merged.set(this.#buf);
    merged.set(value, this.#buf.length);
    this.#buf = merged;
  }
}
