//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { type WebSocket, WebSocketServer } from 'ws';

import * as Protocol from '@dxos/plugin-stream-deck/Protocol';

// Built on first use, not at module scope: when this file is bundled into the plugin's single
// entry, module bodies can run before the protocol module's exports are initialized.
let decodeFrame: ((input: unknown) => Result.Result<Protocol.Frame, Schema.SchemaError>) | undefined;
const frameDecoder = () => (decodeFrame ??= Schema.decodeUnknownResult(Protocol.Frame));

export type BridgeServerOptions = {
  port?: number;
  device: Protocol.DeviceProfile;
  /** Applies a frame to the hardware. */
  onFrame: (frame: Protocol.Frame) => Promise<void>;
  /** Called when the last client goes away, so the device can show its offline state. */
  onDisconnect: () => Promise<void>;
  log?: (message: string, context?: unknown) => void;
};

/**
 * Loopback WebSocket server that Composer connects to.
 *
 * The device plugin listens and Composer dials in, rather than the reverse: a browser tab cannot
 * accept connections, and Elgato's application (and therefore this process) outlives any Composer
 * window. Bound to `127.0.0.1` — the port must never be reachable off the machine.
 */
export class BridgeServer {
  #server?: WebSocketServer;
  #client?: WebSocket;
  readonly #options: BridgeServerOptions;

  constructor(options: BridgeServerOptions) {
    this.#options = options;
  }

  get connected(): boolean {
    return this.#client !== undefined;
  }

  listen(): Promise<void> {
    const port = this.#options.port ?? Protocol.DEFAULT_PORT;
    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({ host: '127.0.0.1', port });
      server.on('listening', () => {
        this.#log(`listening on 127.0.0.1:${port}`);
        resolve();
      });
      server.on('error', reject);
      server.on('connection', (socket) => this.#accept(socket));
      this.#server = server;
    });
  }

  async close(): Promise<void> {
    this.#client?.close();
    this.#client = undefined;
    await new Promise<void>((resolve) => (this.#server ? this.#server.close(() => resolve()) : resolve()));
    this.#server = undefined;
  }

  /** Sends one message to the connected client; a no-op when Composer is not connected. */
  send(message: Protocol.DeviceMessage): void {
    this.#client?.send(JSON.stringify(message));
  }

  // A single client owns the display, so a second connection supersedes the first rather than
  // interleaving frames from two brains.
  #accept(socket: WebSocket): void {
    if (this.#client) {
      this.#log('superseding the previous client');
      this.#client.close();
    }
    this.#client = socket;
    socket.on('message', (data) => this.#receive(String(data)));
    socket.on('close', () => void this.#drop(socket));
    // A socket error is followed by `close`; log it and let the close handler do the cleanup.
    socket.on('error', (error) => this.#log('client error', error));
    this.send({ _tag: 'hello', protocol: Protocol.PROTOCOL_VERSION, device: this.#options.device });
  }

  async #drop(socket: WebSocket): Promise<void> {
    if (this.#client !== socket) {
      return;
    }
    this.#client = undefined;
    this.#log('client disconnected');
    await this.#options.onDisconnect().catch((error) => this.#log('offline render failed', error));
  }

  // Every inbound message is guarded: a malformed or unknown frame from Composer must never take
  // down the process Elgato is hosting.
  async #receive(data: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      this.#log('discarding unparseable message', error);
      return;
    }

    const frame = frameDecoder()(parsed);
    if (Result.isFailure(frame)) {
      this.#log('discarding unrecognized message', frame.failure);
      return;
    }

    await this.#options.onFrame(frame.success).catch((error) => this.#log('frame failed to apply', error));
  }

  #log(message: string, context?: unknown): void {
    this.#options.log?.(message, context);
  }
}
