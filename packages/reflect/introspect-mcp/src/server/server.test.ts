//
// Copyright 2026 DXOS.org
//

// In-memory server tests — verify the MCP wiring (tool registration, input
// validation, response shaping, readiness gate) using the introspect fixture
// monorepo. Plugin/schema list tools are exercised at the call-site level
// only (returning [] against the fixture, since pkg-a / pkg-b aren't
// plugins); their real-monorepo coverage lives in the sanity test.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { type Introspector, createIntrospector } from '@dxos/introspect';

import { createServer } from './server';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, '..', '..', '..', 'introspect', 'src', '__fixtures__');

type Connected = {
  client: Client;
  introspector: Introspector;
  close: () => Promise<void>;
};

const connect = async (): Promise<Connected> => {
  const introspector = createIntrospector({ rootPath: FIXTURE_ROOT, cache: false });
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

  // Bump the hook timeout: under CI load `createIntrospector({ cache: false })`
  // + `introspector.ready` (which indexes the fixture monorepo) can take more
  // than the default 10s, leading to spurious hook timeouts.
  beforeAll(async () => {
    env = await connect();
  }, 30_000);

  afterAll(async () => {
    await env.close();
  });

  test('lists every registered tool', async ({ expect }) => {
    const { tools } = await env.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'find_symbol',
      'get_package',
      'get_symbol',
      'list_capabilities',
      'list_idioms',
      'list_operations',
      'list_packages',
      'list_plugins',
      'list_schemas',
      'list_surfaces',
      'list_symbols',
    ]);
  });

  // ----- Packages & symbols -----

  test('list_packages returns the fixture packages', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_packages', arguments: {} });
    const payload = parseToolText(result as any) as { data: Array<{ name: string }> };
    const names = payload.data.map((p) => p.name).sort();
    expect(names).toContain('@fixture/pkg-a');
    expect(names).toContain('@fixture/pkg-b');
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

  test('list_symbols enumerates a package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_symbols',
      arguments: { package: '@fixture/pkg-a' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ name: string }> };
    const names = payload.data.map((s) => s.name).sort();
    expect(names).toContain('Task');
    expect(names).toContain('make');
  });

  test('find_symbol locates a known symbol', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_symbol',
      arguments: { query: 'Task' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ ref: string }> };
    expect(payload.data.some((m) => m.ref === '@fixture/pkg-a#Task')).toBe(true);
  });

  test('get_symbol returns signature + summary', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#make' },
    });
    const payload = parseToolText(result as any) as {
      data: { ref: string; signature: string } | null;
    };
    expect(payload.data?.ref).toBe('@fixture/pkg-a#make');
    expect(payload.data?.signature).toContain('make');
  });

  test('get_symbol with include=["source"] expands the body', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#Task', include: ['source'] },
    });
    const payload = parseToolText(result as any) as { data: { source?: string } | null };
    expect(payload.data?.source).toContain('Schema.Struct');
  });

  // ----- Plugin / surface / capability / operation / schema list tools -----
  // Fixture monorepo has no plugins, so each call returns []. The shape
  // matters: data must be an array, no error.

  test.each([['list_plugins'], ['list_surfaces'], ['list_capabilities'], ['list_operations'], ['list_schemas']])(
    '%s returns an empty array against the fixture monorepo',
    async (name) => {
      const result = await env.client.callTool({ name, arguments: {} });
      const payload = parseToolText(result as any) as { data: unknown[] };
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data).toEqual([]);
    },
  );

  // ----- limit + compact list options -----

  test('list_symbols with `limit` overrides the default cap', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_symbols',
      arguments: { package: '@fixture/pkg-a', limit: 1 },
    });
    const payload = parseToolText(result as any) as { data: Array<unknown>; truncated?: string };
    expect(payload.data.length).toBe(1);
    expect(payload.truncated).toBeDefined();
  });

  test('list_symbols with `compact: true` strips non-essential fields', async ({ expect }) => {
    const compact = parseToolText(
      (await env.client.callTool({
        name: 'list_symbols',
        arguments: { package: '@fixture/pkg-a', compact: true },
      })) as any,
    ) as { data: Array<Record<string, unknown>> };
    expect(compact.data.length).toBeGreaterThan(0);
    const keys = Object.keys(compact.data[0]).sort();
    expect(keys).toEqual(['name', 'ref']);
  });

  test('list_packages rejects out-of-range `limit`', async ({ expect }) => {
    const tooSmall = (await env.client.callTool({
      name: 'list_packages',
      arguments: { limit: 0 },
    })) as { isError?: boolean };
    expect(tooSmall.isError).toBe(true);

    const tooLarge = (await env.client.callTool({
      name: 'list_packages',
      arguments: { limit: 99999 },
    })) as { isError?: boolean };
    expect(tooLarge.isError).toBe(true);
  });
});
