//
// Copyright 2026 DXOS.org
//

// End-to-end HTTP integration test: boots the CLI as a subprocess in --http
// mode, connects via the SDK's StreamableHTTPClientTransport, exercises tool
// calls. Catches transport-specific failures (auth handling, body parsing,
// session semantics) that the stdio test can't.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, 'cli.ts');
const FIXTURE_ROOT = join(__dirname, '..', '..', 'introspect', 'src', '__fixtures__');

// Pick a high port that's unlikely to collide with a running dev tool.
const PORT = 39476;

describe('http integration', () => {
  let serverProcess: ReturnType<typeof spawn>;
  let client: Client;

  beforeAll(async () => {
    const tsx = join(FIXTURE_ROOT, '..', '..', '..', '..', '..', 'node_modules', '.bin', 'tsx');
    serverProcess = spawn(tsx, ['--conditions=source', CLI_PATH, '--root', FIXTURE_ROOT, '--http', String(PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for the "HTTP server listening" line on stderr.
    await new Promise<void>((resolveListen, rejectListen) => {
      const onErr = (chunk: Buffer) => {
        if (chunk.toString().includes('HTTP server listening')) {
          serverProcess.stderr?.off('data', onErr);
          resolveListen();
        }
      };
      serverProcess.stderr?.on('data', onErr);
      serverProcess.once('error', rejectListen);
      setTimeout(() => rejectListen(new Error('server did not start within 30s')), 30_000);
    });

    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${PORT}/mcp`));
    client = new Client({ name: 'http-probe', version: 'test' }, { capabilities: {} });
    await client.connect(transport);
  }, 60_000);

  afterAll(async () => {
    await client?.close().catch(() => undefined);
    serverProcess?.kill('SIGTERM');
  });

  test('subprocess starts in HTTP mode and lists the five tools', async ({ expect }) => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['find_symbol', 'get_package', 'get_symbol', 'list_packages', 'list_symbols']);
  });

  test('list_packages round-trips JSON-RPC over HTTP', async ({ expect }) => {
    const result = (await client.callTool({ name: 'list_packages', arguments: {} })) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';
    const payload = JSON.parse(text) as { data: Array<{ name: string }> };
    expect(payload.data.map((p) => p.name)).toContain('@fixture/pkg-a');
  });
});
