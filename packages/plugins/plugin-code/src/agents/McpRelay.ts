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
  readonly #handles = new Map<string, CodeCapabilities.McpHandle>();
  #socket: Promise<WebSocket> | undefined;

  constructor(private readonly _url: () => Promise<{ url: string; token: string }>) {}

  /** Serves `handle` as `server`, connecting first if need be. */
  async serve(server: string, handle: CodeCapabilities.McpHandle): Promise<void> {
    this.#handles.set(server, handle);
    const socket = await (this.#socket ??= this.#connect().catch((error) => {
      this.#socket = undefined;
      throw error;
    }));
    send(socket, { _tag: 'register', server });
  }

  async close(server: string): Promise<void> {
    this.#handles.delete(server);
    const socket = await this.#socket?.catch(() => undefined);
    if (socket?.readyState === WebSocket.OPEN) {
      send(socket, { _tag: 'unregister', server });
    }
  }

  async #connect(): Promise<WebSocket> {
    const { url, token } = await this._url();
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)]);
      socket.onopen = () => {
        // Everything served before a reconnect is served again.
        for (const server of this.#handles.keys()) {
          send(socket, { _tag: 'register', server });
        }
        resolve(socket);
      };
      socket.onerror = () => reject(new Error('could not connect to the agent helper for MCP'));
      socket.onclose = () => {
        this.#socket = undefined;
      };
      socket.onmessage = (event) => {
        const frame = Schema.decodeUnknownOption(Schema.fromJsonString(Protocol.McpRequestFrame))(String(event.data));
        if (Option.isNone(frame)) {
          log.warn('agent helper sent an unreadable MCP frame');
          return;
        }
        void answer(frame.value, this.#handles.get(frame.value.server)).then((response) => send(socket, response));
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
