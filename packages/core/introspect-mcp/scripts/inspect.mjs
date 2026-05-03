#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Launch MCP Inspector against this server, with all paths absolutized and
// pre-baked. Run from any cwd:
//
//   node packages/core/introspect-mcp/scripts/inspect.mjs
//
// The script:
//   1. Resolves the CLI path and the monorepo root by walking up from this
//      file — independent of cwd.
//   2. Spawns `npx @modelcontextprotocol/inspector ...` with those absolute
//      paths so Inspector's spawn cwd doesn't matter.
//   3. Forwards stdout/stderr so you see the URL with the auth token.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '..', 'src', 'cli.ts');

// Walk up to find pnpm-workspace.yaml — that's the monorepo root.
const findRepoRoot = (start) => {
  let cursor = start;
  while (true) {
    if (existsSync(resolve(cursor, 'pnpm-workspace.yaml'))) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
};

const root = findRepoRoot(here);
if (!root) {
  console.error('Could not find pnpm-workspace.yaml from', here);
  process.exit(1);
}
if (!existsSync(cli)) {
  console.error('Could not find CLI at', cli);
  process.exit(1);
}

// Prefer the workspace-local tsx binary so we don't depend on `npx tsx`
// having to download or pick a different version in restricted environments.
const tsx = join(root, 'node_modules', '.bin', 'tsx');
if (!existsSync(tsx)) {
  console.error(`[inspect] tsx not found at ${tsx} — run \`pnpm install\` from the repo root first.`);
  process.exit(1);
}

console.error(`[inspect] CLI:  ${cli}`);
console.error(`[inspect] Root: ${root}`);
console.error(`[inspect] tsx:  ${tsx}`);
console.error('[inspect] Launching MCP Inspector — open the URL it prints (with ?MCP_PROXY_AUTH_TOKEN=...).');
console.error('');

const child = spawn('npx', ['@modelcontextprotocol/inspector', tsx, '--conditions=source', cli, '--root', root], {
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error(`[inspect] Failed to spawn Inspector: ${err.message}`);
  process.exit(1);
});
// Preserve a non-zero exit when the Inspector terminates via signal — a
// Ctrl-C/SIGTERM should not look like a successful run.
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
// Forward signals to the child but let its own `exit` handler decide the
// final exit code, so signal-terminated runs propagate correctly.
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
