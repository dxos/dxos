//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { dxBin } from '../../testing';

/**
 * Protocol-level test for `dx mcp serve`: drives a real MCP session over stdio against an isolated
 * HOME (no identity — the projected surface comes from the operation registry, not from spaces).
 *
 * `runDx` cannot serve here: `spawnSync` closes stdin as soon as its input is written, and the
 * server exits with the stream rather than answering.
 */

const REQUESTS = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  { jsonrpc: '2.0', id: 3, method: 'prompts/list', params: {} },
];

type Response = { id?: number; result?: any };

/** Boots the server, sends the requests, and resolves once every awaited id has answered. */
const runSession = (awaitedIds: number[], timeout: number): Promise<Map<number, Response>> =>
  new Promise((resolve, reject) => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-test-'));
    const child = spawn(dxBin, ['mcp', 'serve'], {
      env: {
        ...process.env,
        HOME: home,
        PROTO_HOME: process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto'),
        DX_DEBUG: 'error',
        NO_COLOR: '1',
        PROTO_REPORTER: 'text',
      },
    });

    const responses = new Map<number, Response>();
    let buffer = '';
    const finish = (error?: Error) => {
      clearTimeout(timer);
      child.kill('SIGKILL');
      fs.rmSync(home, { recursive: true, force: true });
      error ? reject(error) : resolve(responses);
    };
    const timer = setTimeout(
      () => finish(new Error(`timed out awaiting ${awaitedIds}; got ${[...responses.keys()]}`)),
      timeout,
    );

    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines.filter((entry) => entry.trim().length > 0)) {
        try {
          const message: Response = JSON.parse(line);
          if (message.id !== undefined) {
            responses.set(message.id, message);
          }
        } catch {
          // Not a protocol message; the transport is line-delimited JSON and anything else is noise.
        }
      }
      if (awaitedIds.every((id) => responses.has(id))) {
        finish();
      }
    });
    child.on('error', finish);

    for (const request of REQUESTS) {
      child.stdin.write(`${JSON.stringify(request)}\n`);
    }
  });

describe('dx mcp serve', () => {
  // Boots a client, activates plugins and reads the operation registry, so it runs well past the
  // default per-test budget.
  test('serves the projected surface over a real MCP session', { timeout: 120_000 }, async ({ expect }) => {
    const responses = await runSession([1, 2, 3], 90_000);

    const initialize = responses.get(1)!.result;
    expect(initialize.serverInfo.name).to.equal('DXOS Spaces');
    // The shared server instructions, applied by the projection's response passes over stdio.
    expect(initialize.instructions).to.include('skillLoad');

    const tools: { name: string; inputSchema: any }[] = responses.get(2)!.result.tools;
    const names = tools.map((tool) => tool.name);
    expect(names).to.include('skillLoad');
    // Annotated operations project; the registry the CLI assembles carries the project/task verbs.
    expect(names).to.include('taskCreate');
    expect(names).to.include('projectCreate');

    // Every advertised schema declares an object, and a ref parameter is narrowed to its object
    // shape rather than the untyped `anyOf` the toolkit renders — both response passes, on the
    // transport EDGE does not use.
    for (const tool of tools) {
      expect(tool.inputSchema.type, `${tool.name} input schema`).to.equal('object');
    }
    const taskSet = tools.find((tool) => tool.name === 'taskCreate')!.inputSchema.properties.taskSet;
    expect(taskSet.type).to.equal('object');
    expect(taskSet).to.not.have.property('anyOf');

    const prompts: { name: string }[] = responses.get(3)!.result.prompts;
    expect(prompts.map((prompt) => prompt.name)).to.include('codeProject');
  });
});
