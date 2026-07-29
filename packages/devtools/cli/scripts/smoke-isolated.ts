#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

//
// Runs the compiled binary with the workspace's `node_modules` replaced by an empty directory, which
// is what every machine except the one that built it looks like. `smoke.ts` cannot detect this class
// of defect — it builds and runs in the same place, so a path baked in at bundle time always resolves
// — and neither can CI, which is how a binary that reads its build machine's `node_modules` reached
// npm as @dxos/cli@0.10.0.
//
// NOT wired into CI yet: the binary still fails here, because it embeds native addons (`classic-level`
// at startup, plus `sharp`, `koffi`, `node-datachannel` and friends in the graph) that a single-file
// binary cannot carry. Deciding which of those belong in a compiled CLI is a graph question, not a
// bundler one. Gate `cli:publish` on this once they are gone.
//

const platformKey = `${process.platform}-${process.arch}`;
const binaryName = process.platform === 'win32' ? 'dx.exe' : 'dx';
const binary = resolve(`dist/cli-${platformKey}`, binaryName);

if (!existsSync(binary)) {
  console.error(`[Isolated] ${binary} not found. Run \`moon run cli:bundle\` first.`);
  process.exit(1);
}

if (process.platform !== 'linux') {
  console.log(`[Isolated] Skipped: needs Linux mount namespaces (host is ${process.platform}).`);
  process.exit(0);
}

const workspaceRoot = resolve('../../..');
const nodeModules = join(workspaceRoot, 'node_modules');

// `--map-root-user` so an unprivileged user can still create the namespace and bind-mount inside it.
const empty = mkdtempSync(join(tmpdir(), 'dx-isolated-'));
const script = `mount --bind "$1" "$2" || exit 42; shift 2; exec "$@"`;
const result = spawnSync(
  'unshare',
  ['-m', '--map-root-user', 'bash', '-c', script, '--', empty, nodeModules, binary, '--version'],
  { encoding: 'utf8', env: process.env },
);
rmSync(empty, { recursive: true, force: true });

if (result.error || result.status === 42) {
  console.log(`[Isolated] Skipped: could not create a mount namespace (${result.error?.message ?? 'bind failed'}).`);
  process.exit(0);
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
if (result.status !== 0) {
  console.error(`[Isolated] \`dx --version\` failed with ${nodeModules} hidden (exit ${result.status}).`);
  console.error('[Isolated] The binary is reaching back into the machine that built it:');
  console.error(output.split('\n').slice(0, 12).join('\n'));
  process.exit(1);
}

console.log(`[Isolated] ✓ ${result.stdout.trim()} with ${nodeModules} hidden`);
