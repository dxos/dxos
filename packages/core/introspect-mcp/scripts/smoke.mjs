#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Smoke test: spawn the CLI, send initialize + tools/list over stdio, print
// a one-line summary. Avoids shell-quoting traps. Run from any cwd:
//   node packages/core/introspect-mcp/scripts/smoke.mjs

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 30_000;

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '..', 'src', 'cli.ts');
const root = resolve(here, '..', '..', '..', '..'); // monorepo root
const tsx = join(root, 'node_modules', '.bin', 'tsx');

const child = spawn(tsx, ['--conditions=source', cli, '--root', root], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

child.on('error', (err) => {
  console.error(`Failed to spawn smoke test: ${err.message}`);
  process.exit(1);
});

const killTimer = setTimeout(() => {
  console.error(`Smoke test timed out after ${TIMEOUT_MS}ms — killing child.`);
  child.kill('SIGKILL');
  process.exit(1);
}, TIMEOUT_MS);

const messages = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } },
  },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
];

for (const msg of messages) {
  child.stdin.write(`${JSON.stringify(msg)}\n`);
}
child.stdin.end();

let buf = '';
child.stdout.on('data', (chunk) => {
  buf += chunk.toString();
});

child.on('close', () => {
  clearTimeout(killTimer);
  const lines = buf.split('\n').filter(Boolean);
  console.log(`Got ${lines.length} response lines.`);
  let sawInitialize = false;
  let sawTools = false;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1 && parsed.result?.serverInfo) {
        console.log(`  initialize → ${parsed.result.serverInfo.name} v${parsed.result.serverInfo.version}`);
        sawInitialize = true;
      } else if (parsed.id === 2 && Array.isArray(parsed.result?.tools)) {
        const names = parsed.result.tools.map((t) => t.name).join(', ');
        console.log(`  tools/list → ${parsed.result.tools.length} tools: [${names}]`);
        sawTools = true;
      } else if (parsed.error) {
        console.log(
          `  error      → id=${parsed.id ?? 'none'}: ${parsed.error.message ?? JSON.stringify(parsed.error)}`,
        );
      } else {
        console.log(`  other      → id=${parsed.id ?? 'none'}`);
      }
    } catch {
      console.log(`  unparseable: ${line.slice(0, 80)}`);
    }
  }
  // Exit 0 only when both expected responses were recognised — not just when
  // two non-empty lines arrived.
  process.exit(sawInitialize && sawTools ? 0 : 1);
});
