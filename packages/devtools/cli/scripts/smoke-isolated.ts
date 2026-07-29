#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

//
// Development shortcut: runs the binary straight out of `dist/` with the workspace's `node_modules`
// hidden, skipping the pack-and-install that `smoke.ts` does. `cli:smoke` is the gate and covers this
// same isolation against the installed tarballs — reach for this one while iterating on a build fix,
// where waiting on `npm pack` of a 233 MB binary each round is the slow part.
//
// Commands are limited to `--help`-style invocations so nothing touches the network or a real profile;
// the point is module initialisation, which is where this class of failure happens.
//

const COMMANDS = [['--version'], ['--help'], ['registry', '--help'], ['function', '--help'], ['space', '--help']];

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
const empty = mkdtempSync(join(tmpdir(), 'dx-isolated-'));

// `--map-root-user` so an unprivileged user can still create the namespace and bind-mount inside it.
const script = 'mount --bind "$1" "$2" || exit 42; shift 2; exec "$@"';
const runIsolated = (args: string[]) =>
  spawnSync('unshare', ['-m', '--map-root-user', 'bash', '-c', script, '--', empty, nodeModules, binary, ...args], {
    encoding: 'utf8',
    env: process.env,
  });

console.log(`[Isolated] Running ${COMMANDS.length} commands with ${nodeModules} hidden...`);

const failures: string[] = [];
for (const args of COMMANDS) {
  const label = `dx ${args.join(' ')}`;
  const result = runIsolated(args);

  if (result.error || result.status === 42) {
    rmSync(empty, { recursive: true, force: true });
    console.log(`[Isolated] Skipped: could not create a mount namespace (${result.error?.message ?? 'bind failed'}).`);
    process.exit(0);
  }

  if (result.status === 0) {
    console.log(`[Isolated]   ✓ ${label}`);
    continue;
  }

  failures.push(label);
  console.error(`[Isolated]   ✗ ${label} (exit ${result.status})`);
  console.error(
    `${result.stdout ?? ''}${result.stderr ?? ''}`
      .split('\n')
      .filter((line) => /error|ENOENT|No native build|loaded from/i.test(line))
      .slice(0, 4)
      .map((line) => `[Isolated]     ${line.trim()}`)
      .join('\n'),
  );
}

rmSync(empty, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`[Isolated] ${failures.length} of ${COMMANDS.length} failed — the binary needs its build machine.`);
  process.exit(1);
}

console.log(`[Isolated] ✓ all ${COMMANDS.length} commands ran with ${nodeModules} hidden`);
