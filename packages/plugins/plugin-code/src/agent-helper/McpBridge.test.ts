//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';
import { WebSocket } from 'ws';

import * as Protocol from '../agents/Protocol.ts';
import { type AgentServer, serve } from './server.ts';

const TOKEN = 'c'.repeat(48);
const MCP_TOKEN = 'f'.repeat(64);

describe('McpBridge', () => {
  let server: AgentServer;

  beforeEach(async () => {
    server = await serve({ token: TOKEN, agents: [], path: [] });
  });

  afterEach(async () => {
    await server.close();
  });

  /** The page's side: answers every request for `server` with `answer`. */
  const host = async (servers: string[], answer: (frame: Protocol.McpRequestFrame) => Protocol.McpHostFrame) => {
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}${Protocol.MCP_HOST_PATH}`, [
      Protocol.SUBPROTOCOL,
      Protocol.tokenProtocol(TOKEN),
    ]);
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    ws.on('message', (data) => {
      const frame = JSON.parse(data.toString());
      ws.send(JSON.stringify(answer(frame)));
    });
    for (const id of servers) {
      ws.send(JSON.stringify({ _tag: 'register', server: id, token: MCP_TOKEN } satisfies Protocol.McpHostFrame));
    }
    // Registration is a frame like any other; give it a turn to land.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return ws;
  };

  const post = (server_: string, body: string, token = MCP_TOKEN) =>
    fetch(`http://127.0.0.1:${server.port}${Protocol.MCP_PATH}/${server_}?probe=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
      body,
    });

  test("relays an agent's request to the page and the page's answer back", async ({ expect }) => {
    const seen: Protocol.McpRequestFrame[] = [];
    const ws = await host(['srv'], (frame) => {
      seen.push(frame);
      return {
        _tag: 'response',
        id: frame.id,
        status: 200,
        headers: [['content-type', 'application/json']],
        body: '{"ok":true}',
      };
    });

    const response = await post('srv', '{"jsonrpc":"2.0"}');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(seen).toMatchObject([
      { server: 'srv', method: 'POST', path: '/mcp/srv?probe=1', body: '{"jsonrpc":"2.0"}' },
    ]);
    ws.close();
  });

  test('refuses an unregistered server, a wrong MCP token, and a page without the helper token', async ({ expect }) => {
    const ws = await host(['srv'], (frame) => ({ _tag: 'response', id: frame.id, status: 200, headers: [], body: '' }));
    expect((await post('other', '{}')).status).toBe(404);
    // The server id alone is not enough: the agent must present the token registered with it.
    expect((await post('srv', '{}', '0'.repeat(64))).status).toBe(401);
    ws.close();

    const intruder = new WebSocket(`ws://127.0.0.1:${server.port}${Protocol.MCP_HOST_PATH}`, [
      Protocol.SUBPROTOCOL,
      Protocol.tokenProtocol('d'.repeat(48)),
    ]);
    await expect(
      new Promise((resolve, reject) => {
        intruder.once('open', resolve);
        intruder.once('error', reject);
      }),
    ).rejects.toThrow();
  });

  test('a request in flight when the page goes away fails rather than hanging', async ({ expect }) => {
    let ws: WebSocket | undefined;
    ws = await host(['srv'], () => {
      ws?.close();
      return { _tag: 'unregister', server: 'ignored' };
    });
    expect((await post('srv', '{}')).status).toBe(503);
  });
});
