//
// Copyright 2026 DXOS.org
//

// Entry point for the dx-introspect-mcp CLI. Boots an introspector against the
// monorepo root inferred from cwd (or --root) and exposes it over either
// stdio (default) or HTTP (when --http <port> is passed).

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, isAbsolute, resolve } from 'node:path';

import { createIntrospector } from '@dxos/introspect';

import { fileLogger } from './logger';
import { createServer } from './server';

type Args = {
  root: string;
  logPath?: string;
  /** If set, run as an HTTP server on this port instead of stdio. */
  httpPort?: number;
  /** Bind address for HTTP mode. Defaults to localhost. */
  host: string;
  /** Optional bearer token; when set, requests must send `Authorization: Bearer <token>`. */
  apiKey?: string;
};

const parseArgs = (argv: string[]): Args => {
  let root: string | undefined;
  let logPath: string | undefined;
  let httpPort: number | undefined;
  let host = 'localhost';
  let apiKey: string | undefined;
  const valueArgs = new Set(['--root', '--log-path', '--http', '--host', '--api-key']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (valueArgs.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        console.error(`Error: ${arg} requires a value.`);
        printUsage();
        process.exit(1);
      }
      i++;
      switch (arg) {
        case '--root':
          root = value;
          break;
        case '--log-path':
          logPath = value;
          break;
        case '--http':
          httpPort = Number.parseInt(value, 10);
          if (!Number.isFinite(httpPort) || httpPort <= 0) {
            console.error(`Error: --http expects a port number, got "${value}".`);
            process.exit(1);
          }
          break;
        case '--host':
          host = value;
          break;
        case '--api-key':
          apiKey = value;
          break;
      }
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }
  const resolvedRoot = root ? resolveRoot(root) : findMonorepoRoot(process.cwd());
  if (!resolvedRoot) {
    console.error('Could not find monorepo root (looking for pnpm-workspace.yaml). Pass --root explicitly.');
    process.exit(1);
  }
  return { root: resolvedRoot, logPath, httpPort, host, apiKey };
};

const resolveRoot = (root: string): string => (isAbsolute(root) ? root : resolve(process.cwd(), root));

const findMonorepoRoot = (start: string): string | null => {
  let cursor = start;
  while (true) {
    if (existsSync(`${cursor}/pnpm-workspace.yaml`)) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
};

const printUsage = (): void => {
  console.error(
    [
      'Usage: dx-introspect-mcp [options]',
      '',
      'Options:',
      '  --root <path>       Monorepo root (default: discovered from cwd via pnpm-workspace.yaml)',
      '  --log-path <path>   Append-only JSONL log of tool calls (default: stderr-silent)',
      '  --http <port>       Run as HTTP server on the given port (default: stdio)',
      '  --host <addr>       HTTP bind address (default: localhost)',
      '  --api-key <token>   Require `Authorization: Bearer <token>` on HTTP requests',
      '  -h, --help          Show this help',
    ].join('\n'),
  );
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const args = parseArgs(argv);
  const introspector = createIntrospector({ monorepoRoot: args.root });
  await introspector.ready;

  const server = createServer({
    introspector,
    name: '@dxos/introspect-mcp',
    version: '0.0.1',
    logger: args.logPath ? fileLogger(args.logPath) : undefined,
  });

  if (args.httpPort !== undefined) {
    await runHttp(server, args);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Stay alive until stdin closes — the SDK handles that signal internally.
  }
};

const runHttp = async (server: Awaited<ReturnType<typeof createServer>>, args: Args): Promise<void> => {
  // Stateful mode — we keep one transport per client session. The session ID
  // is returned in the initialize response and the client echoes it on every
  // subsequent request. Required because the MCP client expects to send
  // `notifications/initialized` (and later requests) under the same session.
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    // CORS — Composer (and any other browser-based MCP client) sends a
    // cross-origin preflight before the POST. Without these headers, the
    // browser blocks the request and the underlying client surfaces a generic
    // "UnknownException" from Effect.tryPromise. We allow any origin because
    // this server is for local dev only; it should bind to localhost.
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version',
    );
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Apply optional bearer-token auth before delegating to the transport.
    if (args.apiKey) {
      const header = req.headers.authorization ?? '';
      const expected = `Bearer ${args.apiKey}`;
      if (header !== expected) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Bearer');
        res.end('Unauthorized');
        return;
      }
    }
    if (req.url === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/plain');
      res.end('ok\n');
      return;
    }
    if (req.url !== '/mcp' && req.url !== '/mcp/') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    void (async () => {
      const sessionId = req.headers['mcp-session-id'];
      let transport: StreamableHTTPServerTransport | undefined;
      if (typeof sessionId === 'string' && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
      } else {
        // No session yet — must be an `initialize` request. Spin up a new
        // transport, connect it to the shared MCP server, and remember the id.
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport!);
          },
        });
        transport.onclose = () => {
          if (transport!.sessionId) {
            transports.delete(transport!.sessionId);
          }
        };
        await server.connect(transport);
      }
      try {
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error('[introspect-mcp] HTTP transport error:', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    })();
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    httpServer.once('error', rejectListen);
    httpServer.listen(args.httpPort, args.host, () => {
      console.error(`[introspect-mcp] HTTP server listening on http://${args.host}:${args.httpPort}/mcp`);
      if (args.apiKey) {
        console.error('[introspect-mcp] auth: Authorization: Bearer <token> required');
      } else {
        console.error('[introspect-mcp] auth: none — bind to localhost only');
      }
      resolveListen();
    });
  });

  // Stay alive until SIGINT/SIGTERM.
  await new Promise<void>(() => {});
};
