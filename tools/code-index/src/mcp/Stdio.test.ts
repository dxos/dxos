//
// Copyright 2026 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import * as Ontology from '../Ontology.ts';
import * as Sandbox from '../workspace/Sandbox.ts';
import { indexFixture, writeFixture } from './fixture.ts';

/**
 * Spawns the real `code-index mcp` and speaks JSON-RPC to it, because what an MCP client depends on
 * is the wire: a stray banner on stdout breaks it in a way no in-process test can see.
 */

const BIN = fileURLToPath(new URL('../../bin/code-index.ts', import.meta.url));

type Message = { readonly jsonrpc: string; readonly id?: number; readonly result?: unknown; readonly error?: unknown };

type Reply<T> = Message & { readonly result: T };

type Initialized = { readonly protocolVersion: string; readonly instructions?: string };

type Listed = { readonly tools: readonly { readonly name: string; readonly annotations?: object }[] };

type Called = { readonly isError?: boolean; readonly structuredContent?: unknown };

const parse = (line: string): Reply<never> | undefined => {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
};

/** One running server: every stdout line parsed as it arrives, and stderr kept for assertions. */
const start = (bun: string, root: string) => {
  const child: ChildProcessWithoutNullStreams = spawn(bun, [BIN, 'mcp', '--root', root], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines: string[] = [];
  const messages: Message[] = [];
  // Replies are typed by the request that awaits them; the wire itself is untyped JSON.
  const waiting = new Map<number, (message: Reply<never>) => void>();
  let stderr = '';
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.length > 0) {
        lines.push(line);
        // A line that is not JSON is the failure under test, so it is recorded for the assertion.
        const message = parse(line);
        if (message !== undefined) {
          messages.push(message);
          if (message.id !== undefined) {
            waiting.get(message.id)?.(message);
          }
        }
      }
      newline = buffer.indexOf('\n');
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)));

  let nextId = 1;
  const request = <T>(method: string, params: unknown): Promise<Reply<T>> => {
    const id = nextId++;
    const reply = new Promise<Reply<T>>((resolve) => waiting.set(id, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return reply;
  };
  const notify = (method: string, params: unknown = {}) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);

  return { child, lines, messages, request, notify, exited, stderr: () => stderr };
};

const bun = Sandbox.interpreter();

describe.skipIf(bun === undefined)('code-index mcp over stdio', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-mcp-stdio-'));
    await writeFixture(root);
    await indexFixture(root, join(root, 'node_modules', '.code-index'));
  }, 60_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('initialize, tools/list and tools/call query', async () => {
    const server = start(bun ?? 'bun', root);
    try {
      const initialized = await server.request<Initialized>('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'stdio-test', version: '0.0.0' },
      });
      expect(initialized.result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'code-index' } });
      expect(initialized.result.instructions).toContain('deus:');
      server.notify('notifications/initialized');

      const listed = await server.request<Listed>('tools/list', {});
      expect(listed.result.tools.map((tool) => tool.name).sort()).toEqual([
        'ask',
        'describe',
        'files',
        'query',
        'stats',
        'vocabulary',
      ]);
      for (const tool of listed.result.tools) {
        expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      }

      const called = await server.request<Called>('tools/call', {
        name: 'query',
        arguments: {
          sparql: `PREFIX deus: <${Ontology.PREFIX}> SELECT ?path WHERE { ?f deus:path ?path } ORDER BY ?path`,
          limit: 2,
        },
      });
      expect(called.result.isError).not.toBe(true);
      expect(called.result.structuredContent).toEqual({
        vars: ['path'],
        rows: [{ path: 'package.json' }, { path: 'src/a.ts' }],
        limit: 2,
        truncated: true,
      });

      // A second server cannot open the store this one holds, and says which process holds it.
      const second = start(bun ?? 'bun', root);
      expect(await second.exited).not.toBe(0);
      expect(second.stderr()).toContain(`pid ${server.child.pid}`);
      expect(second.lines).toEqual([]);

      // Closing stdin is how a client stops a server; effect's stdio protocol answers it by interrupting
      // the serving fiber (exit 130), so what matters is that the process exits on its own.
      server.child.stdin.end();
      expect(await server.exited).not.toBeNull();
      // stdout belongs to the protocol: every line is a JSON-RPC message, and the banner went to stderr.
      expect(server.messages).toHaveLength(server.lines.length);
      expect(server.messages.every((message) => message.jsonrpc === '2.0')).toBe(true);
      expect(server.stderr()).toContain('code-index mcp: serving');
    } finally {
      server.child.kill();
    }
  }, 120_000);
});
