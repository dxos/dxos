//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from '@effect/vitest';
import * as Schema from 'effect/Schema';

import { McpProtocolError, type McpSession, ToolsListResult, request } from './client.ts';

const SESSION: McpSession = {
  serverUrl: 'https://mcp.example.test',
  clientId: 'client',
  accessToken: 'token',
  identityKey: 'identity',
  spaceIds: [],
};

const TOOLS = { tools: [{ name: 'whoami' }] };

describe('MCP client request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('accepts both JSON and event-stream responses', async ({ expect }) => {
    const requests = stubServer((id) => json({ jsonrpc: '2.0', id, result: TOOLS }));
    await request(SESSION, 'tools/list', {}, ToolsListResult);
    expect(requests.map((sent) => sent.headers.get('accept'))).to.deep.equal(['application/json, text/event-stream']);
  });

  test('parses a JSON object', async ({ expect }) => {
    stubServer((id) => json({ jsonrpc: '2.0', id, result: TOOLS }));
    expect(await request(SESSION, 'tools/list', {}, ToolsListResult)).to.deep.equal(TOOLS);
  });

  test('parses a single-element JSON array', async ({ expect }) => {
    stubServer((id) => json([{ jsonrpc: '2.0', id, result: TOOLS }]));
    expect(await request(SESSION, 'tools/list', {}, ToolsListResult)).to.deep.equal(TOOLS);
  });

  test('picks the response whose id matches from an event stream', async ({ expect }) => {
    stubServer((id) =>
      eventStream([
        { jsonrpc: '2.0', method: 'notifications/message', params: { level: 'info', data: 'working' } },
        { jsonrpc: '2.0', id: id + 1, result: { tools: [] } },
        { jsonrpc: '2.0', id, result: TOOLS },
      ]),
    );
    expect(await request(SESSION, 'tools/list', {}, ToolsListResult)).to.deep.equal(TOOLS);
  });

  test('fails when no message answers the request', async ({ expect }) => {
    stubServer((id) =>
      eventStream([
        { jsonrpc: '2.0', method: 'notifications/message', params: { level: 'info', data: 'working' } },
        { jsonrpc: '2.0', id: id + 1, result: TOOLS },
      ]),
    );
    await expect(request(SESSION, 'tools/list', {}, ToolsListResult)).rejects.toBeInstanceOf(McpProtocolError);
  });
});

const RequestBody = Schema.Struct({ id: Schema.Number });

/** Replaces `fetch` with a server that answers each request by its JSON-RPC id, recording what was sent. */
const stubServer = (respond: (id: number) => Response): Request[] => {
  const requests: Request[] = [];
  vi.stubGlobal('fetch', async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const sent = new Request(...args);
    requests.push(sent);
    const { id } = Schema.decodeUnknownSync(RequestBody)(await sent.clone().json());
    return respond(id);
  });
  return requests;
};

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

const eventStream = (messages: unknown[]): Response =>
  new Response(messages.map((message) => `data: ${JSON.stringify(message)}\n\n`).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  });
