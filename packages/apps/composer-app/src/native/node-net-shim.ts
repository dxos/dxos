//
// Copyright 2026 DXOS.org
//

/**
 * `node:net` / `node:tls` shim for the Tauri webview.
 *
 * Implements the surface `imapflow` actually reaches — `Socket` (connect,
 * write, end, destroy, setKeepAlive, setNoDelay, plus connect/data/end/
 * error/close events) and the `tls` namespace (connect + TLSSocket via
 * STARTTLS upgrade) — backed by four Tauri commands defined in
 * `src-tauri/src/net.rs`.
 *
 * The bundler aliases `node:net` and `node:tls` to this file (web build
 * only). On Cloudflare Workers, the `nodejs_compat` polyfill provides the
 * real modules; on plain browsers without Tauri, `connect()` synchronously
 * throws and the IMAP credential form surfaces an "unavailable" message.
 */

import { EventEmitter } from 'events';

import { Channel, invoke } from '@tauri-apps/api/core';
import { Duplex } from 'readable-stream';

const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

type ConnectOptions = {
  host?: string;
  port?: number;
  servername?: string;
  /** When true, wraps the socket with TLS immediately (port 993 IMAP). */
  secureContext?: boolean;
};

type SocketEvents =
  | 'connect'
  | 'secureConnect'
  | 'data'
  | 'end'
  | 'close'
  | 'error'
  | 'timeout'
  | 'drain';

// `readable-stream`'s Duplex extends EventEmitter at runtime, but its
// shipped type definitions don't always re-export the EventEmitter
// surface — `emitEvent` casts past that gap so we can dispatch the
// socket-style events `imapflow` listens for.
const emitEvent = (target: Duplex, event: string | symbol, ...args: unknown[]): boolean =>
  (target as unknown as { emit: (event: string | symbol, ...args: unknown[]) => boolean }).emit(event, ...args);

class TauriSocket extends Duplex {
  #handle: number | undefined;
  #host: string = '';
  #port: number = 0;
  #channel: Channel<number[]> | undefined;
  #connecting = false;
  #destroyed = false;
  // Re-implement EventEmitter behaviour atop Duplex so listeners using the
  // Node socket API ('connect', 'secureConnect', 'data') keep working.

  constructor() {
    super({ allowHalfOpen: true });
  }

  /**
   * Initiates the TCP connect. Returns `this` so chaining patterns
   * (`new Socket().connect(...).on('data', ...)`) work as in Node.
   */
  connect(options: ConnectOptions, callback?: () => void): this {
    if (!isTauri()) {
      const err = new Error('node:net is unavailable in this runtime (no Tauri).');
      // Defer so listeners attached after .connect() see the event.
      queueMicrotask(() => emitEvent(this, 'error', err));
      return this;
    }
    if (!options.host || !options.port) {
      throw new Error('Socket.connect requires { host, port }.');
    }
    this.#host = options.host;
    this.#port = options.port;
    this.#connecting = true;

    const channel = new Channel<number[]>();
    channel.onmessage = (bytes) => {
      const buffer = new Uint8Array(bytes);
      this.push(buffer);
    };
    this.#channel = channel;

    invoke<number>('net_tcp_connect', {
      host: this.#host,
      port: this.#port,
      secure: !!options.secureContext,
      onData: channel,
    })
      .then((handle) => {
        this.#handle = handle;
        this.#connecting = false;
        emitEvent(this, 'connect');
        if (options.secureContext) {
          emitEvent(this, 'secureConnect');
        }
        if (callback) {
          callback();
        }
      })
      .catch((err) => {
        this.#connecting = false;
        emitEvent(this, 'error', err instanceof Error ? err : new Error(String(err)));
      });

    return this;
  }

  override _write(chunk: Buffer | Uint8Array | string, _encoding: string, callback: (err?: Error) => void): void {
    if (this.#handle === undefined) {
      callback(new Error('Socket is not connected.'));
      return;
    }
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk as Uint8Array);
    invoke<void>('net_tcp_write', { handle: this.#handle, bytes: Array.from(bytes) })
      .then(() => callback())
      .catch((err) => callback(err instanceof Error ? err : new Error(String(err))));
  }

  override _read(): void {
    // Push happens inside the channel onmessage callback.
  }

  override _destroy(err: Error | null, callback: (err: Error | null) => void): void {
    this.#destroyed = true;
    if (this.#handle !== undefined) {
      void invoke('net_tcp_close', { handle: this.#handle }).catch(() => {});
      this.#handle = undefined;
    }
    callback(err);
    emitEvent(this, 'close', !!err);
  }

  setKeepAlive(_enable?: boolean, _initialDelay?: number): this {
    return this;
  }

  setNoDelay(_noDelay?: boolean): this {
    return this;
  }

  setTimeout(_ms: number, _callback?: () => void): this {
    return this;
  }

  /**
   * STARTTLS upgrade — Tauri's `net_tcp_start_tls` swaps the underlying
   * stream in place, so the same handle keeps reading/writing through a
   * TLS-wrapped socket from the next byte onward.
   */
  startTls(host: string): Promise<void> {
    if (this.#handle === undefined) {
      return Promise.reject(new Error('Socket is not connected.'));
    }
    return invoke<void>('net_tcp_start_tls', { handle: this.#handle, host });
  }

  get connecting(): boolean {
    return this.#connecting;
  }

  /** Mirror `node:net.Socket.destroyed`. Tracked alongside Duplex's own flag. */
  get destroyedFlag(): boolean {
    return this.#destroyed;
  }
}

/** Constructor-style export matching `node:net.Socket`. */
export const Socket = TauriSocket;
export type Socket = InstanceType<typeof TauriSocket>;

/** `net.connect(opts, cb)` factory. */
export const connect = (options: ConnectOptions, callback?: () => void): TauriSocket => {
  const socket = new TauriSocket();
  socket.connect(options, callback);
  return socket;
};

export const createConnection = connect;

// Unused on this path but exported for `imapflow`'s import shape.
export const isIP = (_addr: string): number => 0;
export const isIPv4 = (_addr: string): boolean => false;
export const isIPv6 = (_addr: string): boolean => false;

/**
 * `node:tls` namespace shim. `connect` opens a TCP socket with implicit TLS
 * (`secureContext: true`); `TLSSocket` is exposed for type compatibility.
 */
export const tls = {
  connect: (options: ConnectOptions, callback?: () => void): TauriSocket => {
    return connect({ ...options, secureContext: true }, callback);
  },
  TLSSocket: TauriSocket,
};

// Default export so `import net from 'node:net'` works.
export default {
  Socket,
  connect,
  createConnection,
  isIP,
  isIPv4,
  isIPv6,
} as const;

// Make the shim usable from `EventEmitter` consumers if anything probes for it.
void EventEmitter;
