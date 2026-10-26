//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { type Server, createServer } from 'node:http';
import { type AddressInfo } from 'node:net';

import { startTestServer } from '@dxos/mcp-client/testing';

import type * as ClaudeCapabilities from '../types/ClaudeCapabilities.ts';
import * as McpProxy from './McpProxy.ts';
import * as Protocol from './Protocol.ts';

const withTestServer = Effect.acquireRelease(
  Effect.promise(() => startTestServer()),
  (server) => Effect.promise(() => server.close()),
);

/** An MCP `initialize` as an agent sends it, presenting the bearer the helper checked. */
const initialize = () =>
  new Request('http://localhost/mcp/proxy', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer agent-token',
      'accept': 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'agent', version: '1' } },
    }),
  });

/** The helper's relay as `Proxies` uses it, recording what is served. */
const makeRelay = () => {
  const handles = new Map<string, { handle: ClaudeCapabilities.McpHandle; token: string }>();
  const closed: string[] = [];
  const relay: ClaudeCapabilities.AgentHelper['mcp'] = {
    serve: (server, handle, token) =>
      Effect.sync(() => {
        handles.set(server, { handle, token });
        return { url: `http://localhost:4000/mcp/${server}` };
      }),
    close: (server) =>
      Effect.sync(() => {
        handles.delete(server);
        closed.push(server);
      }),
  };
  /** What the relay serves under `server`, which the test expects it to serve. */
  const served = (server: string) => {
    const entry = handles.get(server);
    if (!entry) {
      throw new Error(`${server} is not served`);
    }
    return entry;
  };
  return { relay, served, closed };
};

describe('McpProxy', () => {
  it.effect(
    "presents the connection's credential upstream in place of the agent's bearer",
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;
      const handle = McpProxy.handler(() => ({ url: server.urls.key, apiKey: server.apiKey }));

      const response = yield* Effect.promise(() => handle(initialize()));
      expect(response.status).toBe(200);
      expect(yield* Effect.promise(() => response.text())).toContain('serverInfo');
    }, Effect.scoped),
  );

  it.effect(
    'keeps a rejected credential from sending the agent to sign in',
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;
      const handle = McpProxy.handler(() => ({ url: server.urls.key, apiKey: 'revoked' }));

      const response = yield* Effect.promise(() => handle(initialize()));
      expect(response.status).toBe(401);
      expect(response.headers.has('www-authenticate')).toBe(false);
    }, Effect.scoped),
  );

  it.effect(
    'refuses the standing stream the relay cannot carry',
    Effect.fnUntraced(function* () {
      const handle = McpProxy.handler(() => ({ url: 'http://localhost:1/mcp', apiKey: 'unused' }));
      const response = yield* Effect.promise(() => handle(new Request('http://localhost/mcp/proxy')));
      expect(response.status).toBe(405);
    }),
  );

  it.effect(
    'offers a server with no credential by its URL and proxies one that has a credential',
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;
      const { relay, served } = makeRelay();
      const proxies = new McpProxy.Proxies({ relay: () => relay, serverId: () => 'proxy-1', reserved: ['composer'] });

      const offered = yield* proxies.offer(
        'chat',
        [
          { url: server.urls.open, protocol: 'http' },
          { url: server.urls.key, protocol: 'http', apiKey: server.apiKey },
          { url: 'https://events.example.com/sse', protocol: 'sse', apiKey: 'secret' },
        ],
        'session-token',
      );

      expect(offered).toEqual([
        { type: 'http', name: 'localhost', url: server.urls.open, headers: [] },
        {
          type: 'http',
          name: 'localhost-2',
          url: 'http://localhost:4000/mcp/proxy-1',
          headers: [{ name: 'Authorization', value: `Bearer \${${Protocol.MCP_TOKEN_ENV}}` }],
        },
      ]);
      expect(JSON.stringify(offered)).not.toContain(server.apiKey);
      const proxy = served('proxy-1');
      expect(proxy.token).toBe('session-token');
      const response = yield* Effect.promise(() => proxy.handle(initialize()));
      expect(response.status).toBe(200);
    }, Effect.scoped),
  );

  it.effect(
    'serves the latest credential and stops serving a connection the chat dropped',
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;
      const { relay, served, closed } = makeRelay();
      const proxies = new McpProxy.Proxies({ relay: () => relay, serverId: () => 'proxy-1' });

      yield* proxies.offer('chat', [{ url: server.urls.key, protocol: 'http', apiKey: 'expired' }], 'token');
      yield* proxies.offer('chat', [{ url: server.urls.key, protocol: 'http', apiKey: server.apiKey }], 'token');
      const response = yield* Effect.promise(() => served('proxy-1').handle(initialize()));
      expect(response.status).toBe(200);

      expect(yield* proxies.offer('chat', [], 'token')).toEqual([]);
      expect(closed).toEqual(['proxy-1']);
    }, Effect.scoped),
  );

  it.effect(
    'serves two connections to one server with their own credentials',
    Effect.fnUntraced(function* () {
      const server = yield* withTestServer;
      const { relay, served } = makeRelay();
      let ids = 0;
      const proxies = new McpProxy.Proxies({ relay: () => relay, serverId: () => `proxy-${++ids}` });

      const offered = yield* proxies.offer(
        'chat',
        [
          { url: server.urls.key, protocol: 'http', name: 'work', apiKey: server.apiKey },
          { url: server.urls.key, protocol: 'http', name: 'personal', apiKey: 'revoked' },
        ],
        'session-token',
      );

      expect(offered.map(({ name }) => name)).toEqual(['work', 'personal']);
      expect((yield* Effect.promise(() => served('proxy-1').handle(initialize()))).status).toBe(200);
      expect((yield* Effect.promise(() => served('proxy-2').handle(initialize()))).status).toBe(401);
    }, Effect.scoped),
  );

  it.effect(
    'offers a server under the name Composer gave it',
    Effect.fnUntraced(function* () {
      const proxies = new McpProxy.Proxies({ relay: () => undefined, serverId: () => 'unused' });
      // A repeat's suffix runs past a label's length, and the first of the name is off in this chat.
      const offered = yield* proxies.offer('chat', [
        { url: 'https://two.example.com/mcp', protocol: 'http', name: 'acme-corporation-2' },
      ]);
      expect(offered.map(({ name }) => name)).toEqual(['acme-corporation-2']);
    }),
  );

  it.effect(
    'answers a status that carries no body without one',
    Effect.fnUntraced(function* () {
      // An MCP server may end a session with a bare 204.
      const upstream = yield* Effect.acquireRelease(
        Effect.promise(
          () =>
            new Promise<Server>((resolve) => {
              const server = createServer((_, response) => response.writeHead(204).end());
              server.listen(0, () => resolve(server));
            }),
        ),
        (server) => Effect.promise(() => new Promise<void>((resolve) => server.close(() => resolve()))),
      );
      const { port } = upstream.address() as AddressInfo;
      const handle = McpProxy.handler(() => ({ url: `http://localhost:${port}/mcp`, apiKey: 'key' }));

      const response = yield* Effect.promise(() =>
        handle(new Request('http://localhost/mcp/proxy', { method: 'DELETE' })),
      );
      expect(response.status).toBe(204);
    }, Effect.scoped),
  );

  it.effect(
    'never sends a credential to a server outside HTTPS',
    Effect.fnUntraced(function* () {
      const { relay, closed } = makeRelay();
      const proxies = new McpProxy.Proxies({ relay: () => relay, serverId: () => 'proxy-1' });

      const offered = yield* proxies.offer(
        'chat',
        [{ url: 'http://mcp.example.com/mcp', protocol: 'http', apiKey: 'secret' }],
        'session-token',
      );
      expect(offered).toEqual([]);
      expect(closed).toEqual([]);
    }),
  );
});
