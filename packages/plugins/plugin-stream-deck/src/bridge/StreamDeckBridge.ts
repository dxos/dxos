//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import * as Protocol from '#protocol';

/** Minimal surface of the WebSocket the bridge drives, so node tests can supply `ws`. */
export type SocketLike = {
  send: (data: string) => void;
  close: () => void;
  addEventListener?: (type: string, listener: (event: any) => void) => void;
  on?: (type: string, listener: (...args: any[]) => void) => void;
};

export type StreamDeckBridgeOptions = {
  url?: string;
  /** Injected for tests; defaults to the platform `WebSocket`. */
  connect?: (url: string) => SocketLike;
  onInput?: (input: Protocol.Input) => void;
  /** Called when the device announces itself, so the caller can size the frame it builds. */
  onHello?: (device: Protocol.DeviceProfile) => void;
  onStateChange?: (state: BridgeState) => void;
};

export type BridgeState = 'idle' | 'connecting' | 'connected' | 'incompatible';

const INITIAL_BACKOFF = 1_000;
const MAX_BACKOFF = 30_000;

const decodeMessage = Schema.decodeUnknownResult(Protocol.DeviceMessage);

const listen = (socket: SocketLike, type: string, listener: (event: any) => void): void => {
  // `ws` exposes the Node emitter API and browsers the DOM one; the bridge runs against both.
  if (socket.addEventListener) {
    socket.addEventListener(type, listener);
  } else {
    socket.on?.(type, listener);
  }
};

/**
 * Connects Composer to the device plugin and publishes frames to it.
 *
 * The device plugin listens and this dials in: a browser tab cannot accept connections, and the
 * Elgato-hosted process outlives any Composer window. Most users have no device plugin running, so
 * a failed connection is the normal case — it retries quietly with backoff and never surfaces an
 * error.
 */
export class StreamDeckBridge {
  readonly #options: StreamDeckBridgeOptions;
  readonly #url: string;
  #socket?: SocketLike;
  #state: BridgeState = 'idle';
  #backoff = INITIAL_BACKOFF;
  #timer?: ReturnType<typeof setTimeout>;
  #closed = false;
  #device?: Protocol.DeviceProfile;
  #lastPublished?: string;

  constructor(options: StreamDeckBridgeOptions = {}) {
    this.#options = options;
    this.#url = options.url ?? `ws://127.0.0.1:${Protocol.DEFAULT_PORT}`;
  }

  get state(): BridgeState {
    return this.#state;
  }

  get device(): Protocol.DeviceProfile | undefined {
    return this.#device;
  }

  open(): void {
    this.#closed = false;
    this.#connect();
  }

  close(): void {
    this.#closed = true;
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#socket?.close();
    this.#socket = undefined;
    this.#lastPublished = undefined;
    this.#setState('idle');
  }

  /**
   * Sends a frame, skipping it when nothing changed. The device redraws every key it is given, so
   * republishing an identical frame is pure traffic and visible flicker on some models.
   */
  publish(frame: Protocol.Frame): void {
    if (this.#state !== 'connected' || !this.#socket) {
      return;
    }
    const encoded = JSON.stringify(frame);
    if (encoded === this.#lastPublished) {
      return;
    }
    this.#lastPublished = encoded;
    this.#socket.send(encoded);
  }

  #connect(): void {
    if (this.#closed || this.#state === 'incompatible') {
      return;
    }
    this.#setState('connecting');

    let socket: SocketLike;
    try {
      socket = (this.#options.connect ?? ((url) => new WebSocket(url) as unknown as SocketLike))(this.#url);
    } catch (error) {
      log('stream-deck bridge could not open a socket', { error });
      this.#retry();
      return;
    }

    this.#socket = socket;
    listen(socket, 'open', () => {
      this.#backoff = INITIAL_BACKOFF;
    });
    listen(socket, 'message', (event) => this.#receive(event));
    listen(socket, 'close', () => this.#onClose());
    // A socket error is always followed by close, which owns the retry.
    listen(socket, 'error', () => {});
  }

  #onClose(): void {
    this.#socket = undefined;
    this.#lastPublished = undefined;
    this.#device = undefined;
    if (this.#state === 'incompatible') {
      return;
    }
    this.#retry();
  }

  #retry(): void {
    if (this.#closed) {
      return;
    }
    this.#setState('idle');
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#connect(), this.#backoff);
    this.#backoff = Math.min(this.#backoff * 2, MAX_BACKOFF);
  }

  #receive(event: unknown): void {
    const data = (event as { data?: unknown })?.data ?? event;
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      return;
    }

    const message = decodeMessage(parsed);
    if (Result.isFailure(message)) {
      log('stream-deck bridge discarded an unrecognized message');
      return;
    }

    switch (message.success._tag) {
      case 'hello': {
        // A version mismatch is not retryable: reconnecting would loop against the same peer.
        if (message.success.protocol !== Protocol.PROTOCOL_VERSION) {
          log.warn('stream-deck bridge protocol mismatch', {
            expected: Protocol.PROTOCOL_VERSION,
            actual: message.success.protocol,
          });
          this.#setState('incompatible');
          this.#socket?.close();
          this.#socket = undefined;
          return;
        }
        this.#device = message.success.device;
        this.#setState('connected');
        this.#options.onHello?.(message.success.device);
        break;
      }
      case 'input': {
        this.#options.onInput?.(message.success);
        break;
      }
    }
  }

  #setState(state: BridgeState): void {
    if (this.#state === state) {
      return;
    }
    this.#state = state;
    this.#options.onStateChange?.(state);
  }
}
