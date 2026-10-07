//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import type * as CodeCapabilities from '../types/CodeCapabilities.ts';
import * as Protocol from './Protocol.ts';

/**
 * The page's end of the helper's MCP relay: one WebSocket on which the helper forwards every agent
 * request for a server the page registered, answered by that server's handler.
 */
export class Relay {
  /** Server id to its handler and the token an agent presents for it. */
  readonly #handles = new Map<string, { handle: CodeCapabilities.McpHandle; token: string }>();
  /** Callers waiting for the helper to confirm a registration change, by server, in the order they asked. */
  readonly #acks = new Map<string, ((registered: boolean) => void)[]>();
  #socket: Promise<WebSocket> | undefined;

  constructor(private readonly _url: () => Promise<{ url: string; token: string }>) {}

  /**
   * Serves `handle` as `server` to an agent presenting `token`, connecting first if need be. Resolves once the helper
   * has the registration, so an agent given the server's URL can reach it straight away.
   */
  async serve(server: string, handle: CodeCapabilities.McpHandle, token: string): Promise<void> {
    this.#handles.set(server, { handle, token });
    const socket = await (this.#socket ??= this.#connect().catch((error) => {
      this.#socket = undefined;
      throw error;
    }));
    if (!(await this.#confirm(socket, { _tag: 'register', server, token }))) {
      throw new Error(`the agent helper did not register MCP server ${server}`);
    }
  }

  async close(server: string): Promise<void> {
    this.#handles.delete(server);
    // A connection that never opened registered nothing, so there is nothing to withdraw from it.
    const socket = await this.#socket?.then(
      (socket) => socket,
      () => undefined,
    );
    if (socket?.readyState === WebSocket.OPEN) {
      await this.#confirm(socket, { _tag: 'unregister', server });
    }
  }

  /** Sends a registration change; resolves with whether the helper now has the server, false if the socket closes. */
  #confirm(
    socket: WebSocket,
    frame: Extract<Protocol.McpHostFrame, { _tag: 'register' | 'unregister' }>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.#acks.set(frame.server, [...(this.#acks.get(frame.server) ?? []), resolve]);
      send(socket, frame);
    });
  }

  /** Nothing waiting on a closed socket will hear back. */
  #abandonAcks(): void {
    for (const waiting of this.#acks.values()) {
      waiting.forEach((resolve) => resolve(false));
    }
    this.#acks.clear();
  }

  async #connect(): Promise<WebSocket> {
    const { url, token } = await this._url();
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)]);
      socket.onopen = () => {
        // Everything served before a reconnect is served again.
        for (const [server, { token }] of this.#handles) {
          send(socket, { _tag: 'register', server, token });
        }
        resolve(socket);
      };
      socket.onerror = () => reject(new Error('could not connect to the agent helper for MCP'));
      socket.onclose = () => {
        this.#socket = undefined;
        this.#abandonAcks();
      };
      socket.onmessage = (event) => {
        const frame = Schema.decodeUnknownOption(Schema.fromJsonString(Protocol.McpHelperFrame))(String(event.data));
        if (Option.isNone(frame)) {
          log.warn('agent helper sent an unreadable MCP frame');
          return;
        }
        if (frame.value._tag === 'ack') {
          // A re-registration after a reconnect is acknowledged with nobody waiting on it.
          this.#acks.get(frame.value.server)?.shift()?.(frame.value.registered);
          return;
        }
        void answer(frame.value, this.#handles.get(frame.value.server)?.handle).then((response) =>
          send(socket, response),
        );
      };
    });
  }
}

const send = (socket: WebSocket, frame: Protocol.McpHostFrame): void => socket.send(JSON.stringify(frame));

/** Runs one relayed request through the handler serving it; a server nobody serves any more is gone. */
const answer = async (
  frame: Protocol.McpRequestFrame,
  handle: CodeCapabilities.McpHandle | undefined,
): Promise<Protocol.McpHostFrame> => {
  if (!handle) {
    return { _tag: 'response', id: frame.id, status: 404, headers: [], body: '' };
  }
  try {
    const response = await handle(
      new Request(`http://localhost${frame.path}`, {
        method: frame.method,
        headers: frame.headers.map(([name, value]) => [name, value]),
        body: frame.method === 'GET' || frame.method === 'HEAD' ? undefined : frame.body,
      }),
    );
    return {
      _tag: 'response',
      id: frame.id,
      status: response.status,
      headers: [...response.headers.entries()],
      body: await response.text(),
    };
  } catch (error) {
    log.warn('MCP request failed', { server: frame.server, error });
    return { _tag: 'response', id: frame.id, status: 500, headers: [], body: '' };
  }
};
