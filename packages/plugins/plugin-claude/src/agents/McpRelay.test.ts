//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type AgentServer, serve } from '../agent-helper/server.ts';
import * as McpRelay from './McpRelay.ts';
import * as Protocol from './Protocol.ts';

const TOKEN = 'e'.repeat(48);
const MCP_TOKEN = 'f'.repeat(64);

describe('McpRelay', () => {
  let server: AgentServer;
  let relay: McpRelay.Relay;

  beforeEach(async () => {
    server = await serve({ token: TOKEN, agents: [], path: [] });
    relay = new McpRelay.Relay(async () => ({
      url: `ws://127.0.0.1:${server.port}${Protocol.MCP_HOST_PATH}`,
      token: TOKEN,
    }));
  });

  afterEach(async () => {
    await server.close();
  });

  const post = (id: string) =>
    fetch(`http://127.0.0.1:${server.port}${Protocol.MCP_PATH}/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${MCP_TOKEN}` },
      body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
    });

  test("answers an agent's request with the handler the page serves", async ({ expect }) => {
    await relay.serve(
      'srv',
      async (request) =>
        Response.json({ method: request.method, path: new URL(request.url).pathname, body: await request.json() }),
      MCP_TOKEN,
    );

    const response = await post('srv');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      method: 'POST',
      path: '/mcp/srv',
      body: { jsonrpc: '2.0', id: 1, method: 'ping' },
    });
  });

  test('a closed server is no longer reachable', async ({ expect }) => {
    await relay.serve('srv', async () => Response.json({}), MCP_TOKEN);
    await relay.close('srv');
    expect((await post('srv')).status).toBe(404);
  });
});
