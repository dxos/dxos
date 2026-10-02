//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import { type WebSocket } from 'ws';

import { log } from '@dxos/log';

import * as Protocol from '../agents/Protocol.ts';

const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** An operation can run for a while; a request nobody answers in this time fails. */
const RESPONSE_TIMEOUT_MS = 10 * 60_000;

/** Headers that describe one hop and are recomputed on the next. */
const HOP_HEADERS = new Set(['connection', 'content-length', 'host', 'keep-alive', 'transfer-encoding']);

/**
 * Relays agents' MCP requests to the page, which serves Composer's tools but cannot listen. The page
 * holds one connection; a server id it registered is the only way to reach it, and every id goes
 * with the connection that registered it.
 */
export class Bridge {
  #host: WebSocket | undefined;
  readonly #servers = new Set<string>();
  readonly #pending = new Map<string, { response: ServerResponse; timer: NodeJS.Timeout }>();

  /** Takes the page's connection, replacing any earlier one. */
  attach(ws: WebSocket): void {
    this.#detach();
    this.#host = ws;
    ws.on('message', (data) => this.#receive(data.toString()));
    ws.on('close', () => {
      if (this.#host === ws) {
        this.#detach();
      }
    });
    ws.on('error', (error) => log.warn('mcp host socket failed', { error }));
  }

  /** Relays one request an agent made of `server`, answering it once the page does. */
  async relay(request: IncomingMessage, response: ServerResponse, server: string): Promise<void> {
    const host = this.#host;
    if (!host || host.readyState !== host.OPEN || !this.#servers.has(server)) {
      reply(response, 404, 'unknown MCP server');
      return;
    }
    const body = await readBody(request);
    if (body === undefined) {
      reply(response, 413, 'request too large');
      return;
    }

    const id = randomUUID();
    const timer = setTimeout(() => this.#answer(id, 504, [], 'MCP request timed out'), RESPONSE_TIMEOUT_MS);
    this.#pending.set(id, { response, timer });
    response.on('close', () => this.#forget(id));
    const frame: Protocol.McpRequestFrame = {
      _tag: 'request',
      id,
      server,
      method: request.method ?? 'GET',
      path: request.url ?? '/',
      headers: Object.entries(request.headers).flatMap(([name, value]) =>
        value === undefined || HOP_HEADERS.has(name) ? [] : [[name, Array.isArray(value) ? value.join(', ') : value]],
      ),
      body,
    };
    host.send(JSON.stringify(frame));
  }

  close(): void {
    this.#host?.close();
    this.#detach();
  }

  #receive(text: string): void {
    const frame = Schema.decodeUnknownOption(Protocol.McpHostFrame)(parseJson(text));
    if (Option.isNone(frame)) {
      log.warn('mcp host sent an unreadable frame');
      return;
    }
    switch (frame.value._tag) {
      case 'register':
        this.#servers.add(frame.value.server);
        return;
      case 'unregister':
        this.#servers.delete(frame.value.server);
        return;
      case 'response':
        this.#answer(frame.value.id, frame.value.status, frame.value.headers, frame.value.body);
        return;
    }
  }

  #answer(id: string, status: number, headers: readonly (readonly [string, string])[], body: string): void {
    const pending = this.#forget(id);
    if (!pending || pending.headersSent) {
      return;
    }
    pending.statusCode = status;
    for (const [name, value] of headers) {
      if (!HOP_HEADERS.has(name.toLowerCase())) {
        pending.setHeader(name, value);
      }
    }
    pending.end(body);
  }

  #forget(id: string): ServerResponse | undefined {
    const pending = this.#pending.get(id);
    if (!pending) {
      return undefined;
    }
    clearTimeout(pending.timer);
    this.#pending.delete(id);
    return pending.response;
  }

  /** Nothing registered survives the connection, and nothing waiting on it will be answered. */
  #detach(): void {
    this.#host = undefined;
    this.#servers.clear();
    for (const id of [...this.#pending.keys()]) {
      this.#answer(id, 503, [], 'Composer is not connected');
    }
  }
}

const reply = (response: ServerResponse, status: number, message: string): void => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ error: message }));
};

const readBody = async (request: IncomingMessage): Promise<string | undefined> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      return undefined;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
