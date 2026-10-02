//
// Copyright 2026 DXOS.org
//

import * as acp from '@agentclientprotocol/sdk';
import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import { mkdtemp, rm } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'vitest';
import { WebSocket } from 'ws';

import * as Protocol from '../agents/Protocol.ts';
import type * as AgentSpec from './AgentSpec.ts';
import { type AgentServer, serve } from './server.ts';

const TOKEN = 'a'.repeat(48);
const FAKE_AGENT = fileURLToPath(new URL('../agents/testing/fake-agent-stdio.ts', import.meta.url));

const agents: AgentSpec.AgentSpec[] = [
  { id: 'fake', entry: FAKE_AGENT, executable: { name: 'node', versionArgs: ['--version'] } },
  { id: 'missing', entry: FAKE_AGENT, executable: { name: 'no-such-tool-anywhere', versionArgs: ['--version'] } },
];

describe('agent helper', () => {
  let server: AgentServer;
  let workdir: string;

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'dx-agent-'));
    server = await serve({ token: TOKEN, agents, path: [dirname(process.execPath)] });
  });

  afterEach(async () => {
    await server.close();
    await rm(workdir, { recursive: true, force: true });
  });

  const get = (path: string, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${server.port}${path}`, { headers: { authorization: `Bearer ${TOKEN}`, ...headers } });

  const connect = (options: { token?: string; cwd?: string } = {}) => {
    const url = Protocol.acpUrl({ port: server.port, agent: 'fake', cwd: options.cwd ?? workdir });
    return acp.client({ name: 'test' }).connect(
      createWebSocketStream(url, {
        protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(options.token ?? TOKEN)],
        WebSocket,
      }),
    );
  };

  test('reports which agents can run', async ({ expect }) => {
    const response = await get(Protocol.AGENTS_PATH);
    expect(response.status).toBe(200);
    const statuses: Protocol.AgentStatus[] = await response.json();
    expect(statuses).toEqual([
      { id: 'fake', available: true, version: process.version },
      { id: 'missing', available: false, reason: 'no-such-tool-anywhere is not installed' },
    ]);
  });

  test('refuses a request without the token, or for another host', async ({ expect }) => {
    expect((await get(Protocol.AGENTS_PATH, { authorization: 'Bearer wrong' })).status).toBe(401);

    // `fetch` will not send a forged Host header, which is exactly what a DNS-rebinding page does.
    const status = await new Promise<number | undefined>((resolve, reject) => {
      request(
        {
          host: '127.0.0.1',
          port: server.port,
          path: Protocol.AGENTS_PATH,
          headers: { host: 'evil.example:80', authorization: `Bearer ${TOKEN}` },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      )
        .on('error', reject)
        .end();
    });
    expect(status).toBe(403);
  });

  test('relays an ACP session to the agent process', async ({ expect }) => {
    const updates: string[] = [];
    const connection = acp
      .client({ name: 'test' })
      .onNotification(acp.methods.client.session.update, ({ params }) => {
        if (params.update.sessionUpdate === 'agent_message_chunk' && params.update.content.type === 'text') {
          updates.push(params.update.content.text);
        }
      })
      .connect(
        createWebSocketStream(Protocol.acpUrl({ port: server.port, agent: 'fake', cwd: workdir }), {
          protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(TOKEN)],
          WebSocket,
        }),
      );

    await connection.agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
    });
    const { sessionId } = await connection.agent.request(acp.methods.agent.session.new, {
      cwd: workdir,
      mcpServers: [],
    });
    const response = await connection.agent.request(acp.methods.agent.session.prompt, {
      sessionId,
      prompt: [{ type: 'text', text: 'hi' }],
    });

    expect(response.stopReason).toBe('end_turn');
    expect(updates.join('')).toBe('echo: hi');
    connection.close();
  });

  test('refuses a socket with the wrong token or a missing directory', async ({ expect }) => {
    for (const options of [{ token: 'b'.repeat(48) }, { cwd: join(workdir, 'missing') }]) {
      const connection = connect(options);
      await expect(
        connection.agent.request(acp.methods.agent.initialize, {
          protocolVersion: acp.PROTOCOL_VERSION,
          clientCapabilities: {},
        }),
      ).rejects.toThrow();
      connection.close();
    }
  });
});
