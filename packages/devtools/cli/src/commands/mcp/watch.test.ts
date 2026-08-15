//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WATCH_READY_SENTINEL } from './watch-protocol';

/**
 * Proves the claim `--watch` rests on: `bun --watch` reloads in place, so the client's stdio
 * survives an edit and only the session state is lost — which the supervisor replays. A stub
 * server stands in for `dx mcp serve` because the mechanism is the transport, not the surface,
 * and a real boot per reload would dominate the runtime.
 */

const RUNNER = fileURLToPath(new URL('../../testing/watch-runner.ts', import.meta.url));

/** Answers just enough of the protocol to show which realm replied: `marker` changes on reload. */
const SERVER_FIXTURE = `
import { marker } from './marker';

const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n');

let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += String(chunk);
  const lines = buffer.split('\\n');
  buffer = lines.pop() ?? '';
  for (const line of lines.filter((entry) => entry.trim().length > 0)) {
    const message = JSON.parse(line);
    if (message.method === 'initialize') {
      send({ jsonrpc: '2.0', id: message.id, result: { serverInfo: { name: 'fixture', version: marker } } });
    } else if (message.method === 'ping') {
      send({ jsonrpc: '2.0', id: message.id, result: { marker } });
    }
  }
});

process.stderr.write('${WATCH_READY_SENTINEL}\\n');
`;

type Message = { id?: number | string; method?: string; result?: any };

describe('dx mcp serve --watch', () => {
  test('replays the handshake so an edit is invisible to the client', async ({ expect }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-watch-'));
    fs.writeFileSync(path.join(dir, 'marker.ts'), "export const marker = 'v1';\n");
    fs.writeFileSync(path.join(dir, 'server.ts'), SERVER_FIXTURE);

    // `--conditions=source` so the runner resolves workspace packages without a build, as
    // `bin/dx`'s `DX_SOURCE=1` path does. Safe here where `bin/dx` warns it is not: the runner
    // reaches only `effect`, `@dxos/effect` and `@dxos/errors`, none of the third-party packages
    // whose unshipped `source` fields break that path.
    const child = spawn('bun', ['--conditions=source', 'run', RUNNER, path.join(dir, 'server.ts')], {
      env: { ...process.env, NO_COLOR: '1' },
    });

    const messages: Message[] = [];
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines.filter((entry) => entry.trim().length > 0)) {
        try {
          messages.push(JSON.parse(line));
        } catch {
          // Not a protocol message; the transport is line-delimited JSON and anything else is noise.
        }
      }
    });

    const send = (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`);
    const waitFor = async (label: string, match: (message: Message) => boolean): Promise<Message> => {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const found = messages.find(match);
        if (found) {
          return found;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`timed out awaiting ${label}; saw ${JSON.stringify(messages)}`);
    };

    try {
      send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
      });
      const initialize = await waitFor('initialize', (message) => message.id === 1);
      expect(initialize.result.serverInfo.version).to.equal('v1');
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });

      fs.writeFileSync(path.join(dir, 'marker.ts'), "export const marker = 'v2';\n");
      await waitFor('tools/list_changed', (message) => message.method === 'notifications/tools/list_changed');
      await waitFor('prompts/list_changed', (message) => message.method === 'notifications/prompts/list_changed');

      // The client never re-initialized and never reconnected, yet reaches the reloaded realm.
      send({ jsonrpc: '2.0', id: 2, method: 'ping' });
      const ping = await waitFor('ping', (message) => message.id === 2);
      expect(ping.result.marker).to.equal('v2');
      // The replayed handshake is swallowed rather than forwarded; the client saw one result.
      expect(messages.filter((message) => message.id === 1)).to.have.length(1);
    } finally {
      child.kill('SIGKILL');
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
