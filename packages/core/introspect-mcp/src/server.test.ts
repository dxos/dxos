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

// Reuse the @dxos/introspect package's fixtures so the two test suites stay in sync.
const FIXTURE_ROOT = join(__dirname, '..', '..', 'introspect', 'src', '__fixtures__');

type Connected = {
  client: Client;
  introspector: Introspector;
  close: () => Promise<void>;
};

const connect = async (): Promise<Connected> => {
  const introspector = createIntrospector({ monorepoRoot: FIXTURE_ROOT, cache: false });
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
  // Fixture: @fixture/pkg-a exports an ECHO Task schema (Schema.Struct + Type.object)
  // and a make() factory. Mirrors realistic DXOS shapes so tool responses match
  // what an LLM client would see when querying the real monorepo.
  let env: Connected;

  beforeAll(async () => {
    env = await connect();
  });

  afterAll(async () => {
    await env.close();
  });

  test('lists every tool', async ({ expect }) => {
    const { tools } = await env.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'find_schema_usage',
      'find_symbol',
      'get_package',
      'get_plugin',
      'get_schema',
      'get_symbol',
      'list_capabilities',
      'list_operations',
      'list_packages',
      'list_plugins',
      'list_schemas',
      'list_surfaces',
      'list_symbols',
    ]);
  });

  test('list_symbols returns every symbol in a package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_symbols',
      arguments: { package: '@fixture/pkg-a' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ name: string; kind: string }> };
    const names = payload.data.map((s) => s.name).sort();
    expect(names).toContain('Task');
    expect(names).toContain('make');
  });

  test('list_symbols filters by kind', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_symbols',
      arguments: { package: '@fixture/pkg-b', kind: 'interface' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ name: string; kind: string }> };
    expect(payload.data.every((s) => s.kind === 'interface')).toBe(true);
    expect(payload.data.some((s) => s.name === 'TaskCardProps')).toBe(true);
  });

  test('list_symbols returns empty data for unknown package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_symbols',
      arguments: { package: '@fixture/missing' },
    });
    const payload = parseToolText(result as any) as { data: unknown[] };
    expect(payload.data).toEqual([]);
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
      data: { name: string; entryPoints: string[]; workspaceDependencies: string[] } | null;
    };
    expect(payload.data?.name).toBe('@fixture/pkg-a');
    expect(payload.data?.entryPoints).toContain('src/index.ts');
    expect(payload.data?.workspaceDependencies).toContain('@dxos/echo');
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

  test('find_symbol locates the ECHO Task schema', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_symbol',
      arguments: { query: 'Task' },
    });
    const payload = parseToolText(result as any) as {
      data: Array<{ ref: string; kind: string; summary?: string }>;
    };
    const match = payload.data.find((m) => m.ref === '@fixture/pkg-a#Task');
    expect(match).toBeDefined();
    expect(match!.summary).toContain('Task item');
  });

  test('find_symbol filters by kind', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_symbol',
      arguments: { query: 'make', kind: 'function' },
    });
    const payload = parseToolText(result as any) as {
      data: Array<{ ref: string; kind: string }>;
    };
    expect(payload.data.every((m) => m.kind === 'function')).toBe(true);
    expect(payload.data.some((m) => m.ref === '@fixture/pkg-a#make')).toBe(true);
  });

  test('get_symbol returns signature and JSDoc summary by default', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#make' },
    });
    const payload = parseToolText(result as any) as {
      data: { ref: string; signature: string; source?: string; summary?: string };
    };
    expect(payload.data.ref).toBe('@fixture/pkg-a#make');
    expect(payload.data.signature).toContain('make');
    expect(payload.data.summary).toContain('Task factory');
    expect(payload.data.source).toBeUndefined();
  });

  test('get_symbol with include=["source"] expands the Schema.Struct body', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_symbol',
      arguments: { ref: '@fixture/pkg-a#Task', include: ['source'] },
    });
    const payload = parseToolText(result as any) as { data: { source: string } };
    expect(payload.data.source).toContain('Schema.Struct');
    expect(payload.data.source).toContain('Type.object');
    expect(payload.data.source).toContain('com.example.type.Task');
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

  // ----- Plugin / surface / capability / operation tools (steps 4-5) -----

  test('list_plugins returns the fixture plugin', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_plugins', arguments: {} });
    const payload = parseToolText(result as any) as { data: Array<{ id: string; ref: string; name: string }> };
    expect(payload.data.some((p) => p.id === 'com.example.plugin.fixture')).toBe(true);
    const fixture = payload.data.find((p) => p.id === 'com.example.plugin.fixture');
    expect(fixture!.ref).toBe('plugin:com.example.plugin.fixture');
    expect(fixture!.name).toBe('Fixture Plugin');
  });

  test('list_plugins query filter narrows the result', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_plugins',
      arguments: { query: 'fixture' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ id: string }> };
    expect(payload.data.map((p) => p.id)).toEqual(['com.example.plugin.fixture']);
  });

  test('get_plugin returns surfaces, capabilities, operations, and modules', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_plugin',
      arguments: { id: 'com.example.plugin.fixture' },
    });
    const payload = parseToolText(result as any) as {
      data: {
        id: string;
        modules: Array<{ helper: string }>;
        surfaces: Array<{ id: string; roles?: string[] }>;
        capabilities: Array<{ key: string }>;
        operations: Array<{ key: string; name?: string }>;
        meta: Record<string, unknown>;
      };
    };
    expect(payload.data.id).toBe('com.example.plugin.fixture');
    expect(payload.data.modules.map((m) => m.helper)).toContain('addSurfaceModule');
    expect(payload.data.surfaces.map((s) => s.id).sort()).toEqual(['surface.fixture-article', 'surface.fixture-card']);
    expect(payload.data.capabilities.map((c) => c.key)).toContain('Capabilities.ReactSurface');
    expect(payload.data.operations.map((o) => o.key).sort()).toEqual([
      'com.example.fixture.close',
      'com.example.fixture.open',
    ]);
    expect(payload.data.meta.icon).toBe('ph--cube--regular');
  });

  test('get_plugin returns null with note for unknown plugin id', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_plugin',
      arguments: { id: 'com.example.plugin.missing' },
    });
    const payload = parseToolText(result as any) as { data: null; note: string };
    expect(payload.data).toBeNull();
    expect(payload.note).toContain('No plugin');
  });

  test('list_surfaces aggregates fixture plugin surfaces', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_surfaces', arguments: {} });
    const payload = parseToolText(result as any) as { data: Array<{ id: string; pluginId: string | null }> };
    const ids = payload.data.map((s) => s.id).sort();
    expect(ids).toEqual(['surface.fixture-article', 'surface.fixture-card']);
    expect(payload.data.every((s) => s.pluginId === 'com.example.plugin.fixture')).toBe(true);
  });

  test('list_surfaces filter by pluginId', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_surfaces',
      arguments: { pluginId: 'com.example.plugin.missing' },
    });
    const payload = parseToolText(result as any) as { data: unknown[] };
    expect(payload.data).toEqual([]);
  });

  test('list_capabilities returns the contributed capability keys', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_capabilities', arguments: {} });
    const payload = parseToolText(result as any) as { data: Array<{ key: string }> };
    const keys = payload.data.map((c) => c.key).sort();
    expect(keys).toContain('Capabilities.ReactSurface');
    expect(keys).toContain('Capabilities.OperationHandler');
  });

  test('list_operations returns the operation definitions with names', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_operations', arguments: {} });
    const payload = parseToolText(result as any) as {
      data: Array<{ key: string; name?: string; description?: string }>;
    };
    const open = payload.data.find((o) => o.key === 'com.example.fixture.open');
    expect(open).toBeDefined();
    expect(open!.name).toBe('Open Fixture');
    expect(open!.description).toBe('Opens a fixture document.');
  });

  // ----- Schema tools (step 6) -----

  test('list_schemas returns every fixture schema', async ({ expect }) => {
    const result = await env.client.callTool({ name: 'list_schemas', arguments: {} });
    const payload = parseToolText(result as any) as {
      data: Array<{ typename: string; ref: string; version?: string; fieldCount: number }>;
    };
    const typenames = payload.data.map((s) => s.typename).sort();
    expect(typenames).toContain('com.example.type.Task');
    expect(typenames).toContain('com.example.type.Note');
    const note = payload.data.find((s) => s.typename === 'com.example.type.Note');
    expect(note!.ref).toBe('schema:com.example.type.Note');
    expect(note!.fieldCount).toBe(3);
  });

  test('list_schemas filters by package', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'list_schemas',
      arguments: { package: '@fixture/pkg-a' },
    });
    const payload = parseToolText(result as any) as { data: Array<{ typename: string }> };
    expect(payload.data.map((s) => s.typename)).toEqual(['com.example.type.Task']);
  });

  test('get_schema returns full field detail', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_schema',
      arguments: { typename: 'com.example.type.Task' },
    });
    const payload = parseToolText(result as any) as {
      data: { typename: string; fields: Array<{ name: string; optional: boolean; type: string }> };
    };
    expect(payload.data.typename).toBe('com.example.type.Task');
    const description = payload.data.fields.find((f) => f.name === 'description');
    expect(description!.optional).toBe(true);
  });

  test('get_schema returns null with note for unknown typename', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'get_schema',
      arguments: { typename: 'com.example.type.missing' },
    });
    const payload = parseToolText(result as any) as { data: null; note: string };
    expect(payload.data).toBeNull();
    expect(payload.note).toContain('No schema');
  });

  test('find_schema_usage finds cross-package references', async ({ expect }) => {
    const result = await env.client.callTool({
      name: 'find_schema_usage',
      arguments: { typename: 'com.example.type.Task' },
    });
    const payload = parseToolText(result as any) as {
      data: Array<{ file: string; package: string; line: number; snippet: string }>;
    };
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.data.some((u) => u.package === '@fixture/pkg-plugin')).toBe(true);
    // Defining `Type.object` line is filtered out.
    expect(payload.data.every((u) => !u.snippet.includes('Type.object'))).toBe(true);
  });
});
