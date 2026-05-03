//
// Copyright 2026 DXOS.org
//

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { createIntrospector, type Introspector } from '@dxos/introspect';

import { createServer } from './server';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, '__fixtures__');

type Connected = {
  client: Client;
  introspector: Introspector;
  close: () => Promise<void>;
};

const connect = async (): Promise<Connected> => {
  const introspector = createIntrospector({ monorepoRoot: FIXTURE_ROOT });
  await introspector.ready;
  const server = createServer({ introspector, version: 'test' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: 'test' }, { capabilities: {} });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const close = async (): Promise<void> => {
    await client.close();
    await server.close();
    introspector.dispose();
  };

  return { client, introspector, close };
};

const parseToolText = (result: { content: Array<{ type: string; text?: string }> }): unknown => {
  const text = result.content.find((c) => c.type === 'text')?.text ?? '';
  return JSON.parse(text);
};

describe('introspect-mcp server', () => {
  let env: Connected;

  beforeAll(async () => {
    env = await connect();
  });

  afterAll(async () => {
    await env.close();
  });

  test('lists all four tools', async ({ expect }) => {
    const { tools } = await env.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['find_symbol', 'get_package', 'get_symbol', 'list_packages']);
  });

  test('list_packages returns the fixture package', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_packages', arguments: {} });
    const payload = parseToolText(result as any) as { data: Array<{ name: string }> };
    expect(payload.data.map((p) => p.name)).toContain('@fixture/pkg-a');
  });

  test('list_packages applies the name filter', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_packages',
      arguments: { name: 'pkg-a' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ name: string }> };
    expect(payload.data.map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('get_package returns detail for a known package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_package',
      arguments: { name: '@fixture/pkg-a' },
    });
    const payload = parseToolText(result as any) as {
      data: { name: string; entryPoints: string[] } | null;
    };
    expect(payload.data?.name).toBe('@fixture/pkg-a');
    expect(payload.data?.entryPoints).toContain('src/index.ts');
  });

  test('get_package returns null with note for unknown package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_package',
      arguments: { name: '@fixture/missing' },
    });
    const payload = parseToolText(result as any) as { data: null; note: string };
    expect(payload.data).toBeNull();
    expect(payload.note).toContain('No package');
  });

  test('find_symbol locates a symbol by name', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_symbol',
      arguments: { query: 'add' },
    });
    const payload = parseToolText(result as any) as {
      data: Array<{ ref: string; kind: string }>;
    };
    const match = payload.data.find((m) => m.ref === '@fixture/pkg-a#add');
    expect(match).toBeDefined();
    expect(match!.kind).toBe('function');
  });

  test('find_symbol filters by kind', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_symbol',
      arguments: { query: 'Counter', kind: 'class' },
    });
    const payload = parseToolText(result as any) as {
      data: Array<{ ref: string; kind: string }>;
    };
    expect(payload.data.every((m) => m.kind === 'class')).toBe(true);
    expect(payload.data.some((m) => m.ref === '@fixture/pkg-a#Counter')).toBe(true);
  });

  test('get_symbol returns signature without source by default', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#add' },
    });
    const payload = parseToolText(result as any) as {
      data: { ref: string; signature: string; source?: string; summary?: string };
    };
    expect(payload.data.ref).toBe('@fixture/pkg-a#add');
    expect(payload.data.signature).toContain('add');
    expect(payload.data.summary).toBe('Adds two numbers.');
    expect(payload.data.source).toBeUndefined();
  });

  test('get_symbol with include=["source"] expands the body', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#Counter', include: ['source'] },
    });
    const payload = parseToolText(result as any) as { data: { source: string } };
    expect(payload.data.source).toContain('class Counter');
  });

  test('get_symbol returns null with note for unknown ref', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#nonexistent' },
    });
    const payload = parseToolText(result as any) as { data: null; note: string };
    expect(payload.data).toBeNull();
    expect(payload.note).toContain('No symbol');
  });
});
