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

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '..', 'src', 'cli.ts');
const root = resolve(here, '..', '..', '..', '..'); // monorepo root

const child = spawn('npx', ['tsx', '--conditions=source', cli, '--root', root], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

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
  const lines = buf.split('\n').filter(Boolean);
  console.log(`Got ${lines.length} response lines.`);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1 && parsed.result?.serverInfo) {
        console.log(`  initialize → ${parsed.result.serverInfo.name} v${parsed.result.serverInfo.version}`);
      } else if (parsed.id === 2 && Array.isArray(parsed.result?.tools)) {
        const names = parsed.result.tools.map((t) => t.name).join(', ');
        console.log(`  tools/list → ${parsed.result.tools.length} tools: [${names}]`);
      } else {
        console.log(`  other      → id=${parsed.id ?? 'none'}`);
      }
    } catch {
      console.log(`  unparseable: ${line.slice(0, 80)}`);
    }
  }
  process.exit(lines.length >= 2 ? 0 : 1);
});
