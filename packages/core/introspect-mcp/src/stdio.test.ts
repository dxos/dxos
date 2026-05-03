//
// Copyright 2026 DXOS.org
//

// End-to-end stdio integration test: spawn the actual CLI as a subprocess via
// `StdioClientTransport` and exercise it through real pipes. Catches issues
// the in-memory transport in `server.test.ts` cannot — stdout pollution,
// `--conditions=source` resolution, exports-field mishaps, framing, and
// process startup failures.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, 'cli.ts');
const FIXTURE_ROOT = join(__dirname, '..', '..', 'introspect', 'src', '__fixtures__');

describe('stdio integration', () => {
  let client: Client;

  beforeAll(async () => {
    // tsx + --conditions=source is exactly how end users launch the server in
    // dev. If something about that resolution path breaks, this test catches it.
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', '--conditions=source', CLI_PATH, '--root', FIXTURE_ROOT],
    });
    client = new Client({ name: 'stdio-probe', version: 'test' }, { capabilities: {} });
    await client.connect(transport);
  }, 60_000);

  afterAll(async () => {
    await client?.close();
  });

  test('subprocess starts and lists the five tools', async ({ expect }) => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['find_symbol', 'get_package', 'get_symbol', 'list_packages', 'list_symbols']);
  });

  test('list_packages round-trips real JSON-RPC over stdio', async ({ expect }) => {
    const result = (await client.callTool({ name: 'list_packages', arguments: {} })) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { data: Array<{ name: string }> };
    expect(payload.data.map((p) => p.name)).toContain('@fixture/pkg-a');
  });

  test('find_symbol locates the ECHO Task across the stdio boundary', async ({ expect }) => {
    const result = (await client.callTool({
      name: 'find_symbol',
      arguments: { query: 'Task' },
    })) as { content: Array<{ type: string; text?: string }> };
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { data: Array<{ ref: string }> };
    expect(payload.data.some((m) => m.ref === '@fixture/pkg-a#Task')).toBe(true);
  });
});
