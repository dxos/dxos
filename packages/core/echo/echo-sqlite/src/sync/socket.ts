//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';

import { decodeFrame, encodeFrame } from './codec.ts';
import { type SyncTransport } from './protocol.ts';

/** The path of a space's sync socket on the server. */
export const socketPath = (spaceId: string): string => `/api/space/${spaceId}/socket`;

/** Reconnect delays, in milliseconds, capped at the last. */
const BACKOFF = [250, 500, 1_000, 2_000, 5_000];

export type SocketTransport = SyncTransport & {
  /** Whether the socket is open now. */
  readonly connected: boolean;
  /** Called with the new state whenever the socket opens or closes. */
  onConnectionChange(listener: (connected: boolean) => void): () => void;
  close(): void;
};

/**
 * A sync transport over a WebSocket that reconnects with backoff. Messages sent before the socket
 * opens are queued and sent on open; a request lost to a dropped connection times out, and the round
 * started on reconnect repeats it.
 */
export const connectSocket = (url: string): SocketTransport => {
  const listeners = new Set<(message: FeedProtocol.ProtocolMessage) => void>();
  const connectionListeners = new Set<(connected: boolean) => void>();
  let socket: WebSocket | undefined;
  let attempt = 0;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queued: Uint8Array<ArrayBuffer>[] = [];

  const setConnected = (connected: boolean) => connectionListeners.forEach((listener) => listener(connected));

  const open = () => {
    if (closed) {
      return;
    }
    const next = new WebSocket(url);
    next.binaryType = 'arraybuffer';
    next.onopen = () => {
      attempt = 0;
      const pending = queued;
      queued = [];
      pending.forEach((frame) => next.send(frame));
      setConnected(true);
    };
    next.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) {
        return;
      }
      try {
        const message = decodeFrame(new Uint8Array(event.data));
        listeners.forEach((listener) => listener(message));
      } catch (err) {
        log.warn('dropped an undecodable sync frame', { error: err });
      }
    };
    next.onclose = () => {
      if (socket === next) {
        socket = undefined;
        // Requests queued for a socket that never opened would be answered by nobody; their rounds
        // time out and the round started on reconnect sends fresh ones.
        queued = [];
        setConnected(false);
      }
      if (!closed) {
        timer = setTimeout(open, BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
      }
    };
    socket = next;
  };
  open();

  return {
    get connected() {
      return socket?.readyState === WebSocket.OPEN;
    },
    send: (message) => {
      const frame = encodeFrame(message);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(frame);
      } else if (!closed) {
        queued.push(frame);
      }
    },
    onMessage: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onConnectionChange: (listener) => {
      connectionListeners.add(listener);
      return () => connectionListeners.delete(listener);
    },
    close: () => {
      closed = true;
      clearTimeout(timer);
      socket?.close();
      socket = undefined;
    },
  };
};
