#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Verify the dxos-introspect entry in the user's Claude settings.json works
// end-to-end. Spawns the server using the exact command and args Claude Code
// would use, completes the JSON-RPC initialize handshake, and calls one tool.
//
// Run:
//   node packages/core/introspect-mcp/scripts/check-claude-config.mjs
//
// Exits 0 with a step-by-step trace if every step passes; non-zero with the
// specific failure point otherwise.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SETTINGS = join(homedir(), '.claude', 'settings.json');
// Cold-start the server may need ~80s to build the symbol cache the first
// time. Subsequent runs reuse the disk cache and complete in seconds.
const TIMEOUT_MS = 180_000;

const ok = (msg) => console.log(`✓ ${msg}`);
const fail = (msg, detail) => {
  console.error(`✗ ${msg}`);
  if (detail) {
    console.error(`  ${detail}`);
  }
  process.exit(1);
};

// --- Step 1: read the user's Claude settings.json ----------------------
if (!existsSync(SETTINGS)) {
  fail(`${SETTINGS} not found`, 'Claude Code has never been run, or the file moved.');
}
let settings;
try {
  settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
} catch (err) {
  fail(`could not parse ${SETTINGS}`, String(err));
}
ok(`read ${SETTINGS}`);

// --- Step 2: confirm the dxos-introspect entry exists -------------------
const entry = settings.mcpServers?.['dxos-introspect'];
if (!entry) {
  fail('settings.mcpServers["dxos-introspect"] is missing', 'Add the entry, then re-run this script.');
}
const command = entry.command;
const args = entry.args ?? [];
if (typeof command !== 'string' || !Array.isArray(args)) {
  fail('entry has wrong shape', JSON.stringify(entry));
}
ok(`found entry: ${command} ${args.join(' ')}`);

// --- Step 3: confirm referenced files exist ----------------------------
const cliPath = args.find((a) => typeof a === 'string' && a.endsWith('cli.ts'));
if (cliPath && !existsSync(cliPath)) {
  fail(`cli.ts referenced by entry does not exist`, cliPath);
}
if (cliPath) ok(`cli.ts exists: ${cliPath}`);

const rootIdx = args.indexOf('--root');
const rootPath = rootIdx >= 0 ? args[rootIdx + 1] : undefined;
if (rootPath && !existsSync(join(rootPath, 'pnpm-workspace.yaml'))) {
  fail(`--root does not point at a monorepo (no pnpm-workspace.yaml)`, rootPath);
}
if (rootPath) ok(`--root is a monorepo: ${rootPath}`);

const usingConditionsSource = args.includes('--conditions=source');
if (!usingConditionsSource) {
  fail(
    '--conditions=source missing from args',
    'Without it, tsx fails to resolve @dxos/introspect from src/ — server crashes on import.',
  );
}
ok('--conditions=source present');

// --- Step 4: spawn the exact same way Claude Code would ----------------
console.log(`  (spawning server — cold cache may take ~80s, warm <2s)`);
const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
let stdoutBuf = '';
let stderrBuf = '';
child.stdout.on('data', (chunk) => {
  stdoutBuf += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  stderrBuf += chunk.toString();
});

let killed = false;
const timer = setTimeout(() => {
  killed = true;
  child.kill('SIGKILL');
}, TIMEOUT_MS);

child.on('error', (err) => {
  clearTimeout(timer);
  fail('spawn failed', String(err));
});

// --- Step 5: send initialize + initialized + tools/call list_packages --
const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`);
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'check', version: '0' } },
});
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_packages', arguments: {} } });
child.stdin.end();

await new Promise((resolve) => child.on('close', resolve));
clearTimeout(timer);

if (killed) {
  fail(`server did not respond within ${TIMEOUT_MS}ms`, `stderr tail:\n${stderrBuf.slice(-1500)}`);
}

// --- Step 6: parse responses and assert ---------------------------------
const lines = stdoutBuf.split('\n').filter(Boolean);
const responses = new Map();
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    if (parsed.id != null) {
      responses.set(parsed.id, parsed);
    }
  } catch {
    fail('non-JSON line on stdout (would corrupt MCP stream)', line.slice(0, 200));
  }
}

const init = responses.get(1);
if (!init?.result?.serverInfo?.name) {
  fail('initialize did not return serverInfo', JSON.stringify(init).slice(0, 500));
}
ok(`initialize: ${init.result.serverInfo.name} v${init.result.serverInfo.version}`);

const tools = responses.get(2);
const toolNames = tools?.result?.tools?.map((t) => t.name) ?? [];
if (toolNames.length === 0) {
  fail('tools/list returned 0 tools', JSON.stringify(tools).slice(0, 500));
}
ok(`tools/list: ${toolNames.length} tools [${toolNames.join(', ')}]`);

const call = responses.get(3);
const text = call?.result?.content?.find((c) => c.type === 'text')?.text;
if (!text) {
  fail('tools/call list_packages returned no text content', JSON.stringify(call).slice(0, 500));
}
let payload;
try {
  payload = JSON.parse(text);
} catch (err) {
  fail('tools/call response was not parseable JSON', String(err));
}
const packageCount = payload?.data?.length ?? 0;
if (packageCount === 0) {
  fail('list_packages returned 0 packages — indexer may have failed to find the monorepo');
}
ok(`tools/call list_packages: ${packageCount} packages`);

console.log('\n✅ Claude Code MCP entry is valid and the server round-trips real tool calls.');
console.log('   Restart Claude Code (Cmd+Q + relaunch) to pick up the entry.');
process.exit(0);
