//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { IncomingMessage, ServerResponse } from 'node:http';

import { log } from '@dxos/log';

import * as Protocol from '../client/Protocol.ts';
import * as McpClient from './McpClient.ts';

export type MakeOptions = {
  /** The repository whose index is served; `code-index` runs here and finds its store under `node_modules`. */
  root: string;
  /** The command that serves the index on stdio; defaults to `bun tools/code-index/bin/code-index.ts mcp`. */
  command?: string;
  args?: readonly string[];
  /** Route to answer on; defaults to {@link Protocol.PATH}. */
  path?: string;
  /**
   * Host names accepted beyond localhost and IP literals, as Vite's `server.allowedHosts` takes them (a leading `.`
   * matches subdomains); `true` accepts any host.
   */
  allowedHosts?: readonly string[] | true;
};

export type Middleware = ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>) & {
  close: () => void;
};

const TOOLS = new Set<string>(Protocol.Tool.literals);

const MAX_BODY = 1_000_000;

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error('request too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

/**
 * Whether the `Host` header names this machine. A loopback socket is not enough on its own: a page on a domain that
 * DNS-rebinds to 127.0.0.1 reaches the route same-origin, and only its `Host` gives it away. IP literals pass, as
 * in Vite, since a rebinding attack always arrives under a domain name.
 */
export const isAllowedHost = (header: string | undefined, allowedHosts: readonly string[] | true = []): boolean => {
  if (allowedHosts === true) {
    return true;
  }
  if (!header) {
    return false;
  }
  let hostname: string;
  try {
    hostname = new URL(`http://${header}`).hostname;
  } catch {
    return false;
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[')) {
    return true;
  }
  return allowedHosts.some((allowed) =>
    allowed.startsWith('.') ? hostname === allowed.slice(1) || hostname.endsWith(allowed) : hostname === allowed,
  );
};

/** The media type of a `content-type` header, without parameters, lower-cased. */
export const mediaType = (header: string | undefined): string | undefined => header?.split(';')[0].trim().toLowerCase();

const hostOf = (origin: string): string | undefined => {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
};

const isLoopback = (address: string | undefined) =>
  address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';

const reply = (res: ServerResponse, status: number, body: Protocol.Response) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
  res.end(JSON.stringify(body));
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Connect middleware that answers {@link Protocol.PATH} by calling a read-only `code-index mcp` tool. The index is
 * read-only and local, but it describes the developer's source tree, so only this machine and the app's own page
 * may ask: a JSON content type forces a CORS preflight this route never answers.
 */
export const make = ({
  root,
  command = 'bun',
  args = ['tools/code-index/bin/code-index.ts', 'mcp'],
  path = Protocol.PATH,
  allowedHosts,
}: MakeOptions): Middleware => {
  const client = McpClient.make({ command, args, cwd: root });
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    if (req.method !== 'POST' || req.url?.split('?')[0] !== path) {
      return next();
    }
    if (!isLoopback(req.socket.remoteAddress) || !isAllowedHost(req.headers.host, allowedHosts)) {
      return reply(res, 403, { ok: false, error: 'code-index requests are accepted from this machine only' });
    }
    // The exact media type: a cross-site page may send `text/plain; x=application/json` without a preflight.
    if (mediaType(req.headers['content-type']) !== 'application/json') {
      return reply(res, 415, { ok: false, error: 'content-type must be application/json' });
    }
    // Belt to the same braces, for a client that sends an Origin whose host is not this server's.
    const origin = req.headers.origin;
    if (origin && hostOf(origin) !== req.headers.host) {
      return reply(res, 403, { ok: false, error: 'cross-origin request' });
    }

    let request: unknown;
    try {
      request = JSON.parse(await readBody(req));
    } catch (error) {
      return reply(res, 400, { ok: false, error: `unparseable request: ${String(error)}` });
    }
    if (!isRecord(request) || typeof request.tool !== 'string' || !TOOLS.has(request.tool)) {
      return reply(res, 400, { ok: false, error: `tool must be one of ${[...TOOLS].join(', ')}` });
    }
    const toolArgs = isRecord(request.args) ? request.args : {};

    try {
      const result = await client.callTool(request.tool, toolArgs);
      reply(res, 200, { ok: true, result });
    } catch (error) {
      log.info('code-index call failed', { tool: request.tool, error: String(error) });
      // 200 with `ok: false`: the route worked and the index refused, which the caller reports, not retries.
      reply(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
  return Object.assign(middleware, { close: () => client.close() });
};
