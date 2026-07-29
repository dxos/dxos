#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

//
// The single definition of what a working install looks like: every command, through both entry points.
// Plain node with no dependencies, because it runs in two places — `cli:smoke` after packing and installing
// the tarballs, and the `cli-foreign` CI job on a runner with no checkout, where the tree that built the
// binary does not exist and there is no bun. Keeping one copy is the point: the checks drifted apart when
// the job had its own inline version.
//
// Usage: verify-installed.mjs <install-dir> [--hide <dir>]
//
//   --hide  run each command in a mount namespace with <dir> replaced by an empty directory, which is how
//           a single machine can approximate the foreign one. Skipped, loudly, where unprivileged
//           namespaces are unavailable (the CI build container denies them) — that is what `cli-foreign`
//           covers instead.
//

/** `--help`-shaped so nothing touches the network or a real profile; these failures are all at import. */
const COMMANDS = [['--version'], ['--help'], ['registry', '--help'], ['function', '--help'], ['space', '--help']];

const NAMESPACE_SCRIPT = 'mount --bind "$1" "$2" || exit 42; shift 2; exec "$@"';
const DIAGNOSTIC = /error|ENOENT|No native build|loaded from|Cannot find|Invalid subcommand/i;

const [installDir, ...rest] = process.argv.slice(2);
if (!installDir) {
  console.error('usage: verify-installed.mjs <install-dir> [--hide <dir>]');
  process.exit(2);
}

const hideIndex = rest.indexOf('--hide');
const hide = hideIndex === -1 ? undefined : rest[hideIndex + 1];

const platformKey = `${process.platform}-${process.arch}`;
const binaryName = process.platform === 'win32' ? 'dx.exe' : 'dx';
const modules = join(installDir, 'node_modules');

const launcher = join(modules, '@dxos', 'cli', 'bin', 'dx.js');
const platformBinary = join(modules, '@dxos', `cli-${platformKey}`, binaryName);

for (const path of [launcher, platformBinary]) {
  if (!existsSync(path)) {
    console.error(`[Verify] ${path} not found — was the package installed?`);
    process.exit(1);
  }
}

// Both packages declare a `dx` bin and npm links only one of them, so each is invoked by path — going
// through `node_modules/.bin/dx` would silently drop either the launcher (its platform mapping and
// executable-bit recovery) or the standalone platform install.
const entryPoints = [
  { label: 'launcher', command: process.execPath, prefix: [launcher] },
  { label: 'platform binary', command: platformBinary, prefix: [] },
];

let isolationDir;
let isolate = false;
if (hide) {
  isolationDir = mkdtempSync(join(tmpdir(), 'dx-empty-'));
  const probe = spawnSync(...wrap('true', []), { encoding: 'utf8' });
  // Any non-zero probe means isolation is unavailable, not just a failed bind — the container may refuse
  // to create the namespace at all (`unshare failed: Operation not permitted`).
  isolate = process.platform === 'linux' && !probe.error && probe.status === 0;
  if (isolate) {
    console.log(`[Verify] Running with ${hide} hidden.`);
  } else {
    const reason = probe.error?.message ?? (`${probe.stderr ?? ''}`.trim() || `exit ${probe.status}`);
    console.log(`[Verify] Cannot hide ${hide} (${reason}).`);
    console.log('[Verify] Self-containment is NOT verified here — the cli-foreign job covers it.');
  }
}

function wrap(command, args) {
  return [
    'unshare',
    ['-m', '--map-root-user', 'bash', '-c', NAMESPACE_SCRIPT, '--', isolationDir, hide, command, ...args],
  ];
}

const versions = new Set();
const failures = [];

for (const { label, command, prefix } of entryPoints) {
  for (const args of COMMANDS) {
    const description = `${label}: dx ${args.join(' ')}`;
    const argv = [...prefix, ...args];
    const [resolved, resolvedArgs] = isolate ? wrap(command, argv) : [command, argv];
    const result = spawnSync(resolved, resolvedArgs, { cwd: installDir, encoding: 'utf8' });

    if (result.status !== 0) {
      failures.push(description);
      console.error(`[Verify]   ✗ ${description} (exit ${result.status ?? result.error})`);
      const lines = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').filter((line) => line.trim());
      // Prefer lines that name a cause, but never swallow the output when none match — an unrecognised
      // failure is exactly the one worth seeing.
      const named = lines.filter((line) => DIAGNOSTIC.test(line));
      const shown = named.length > 0 ? named.slice(0, 4) : lines.slice(-8);
      console.error(
        shown.length > 0
          ? shown.map((line) => `[Verify]     ${line.trim()}`).join('\n')
          : '[Verify]     (no output on stdout or stderr)',
      );
      continue;
    }

    // Exiting zero is not enough: a silent success would otherwise pass without proving anything ran.
    const output = result.stdout.trim();
    if (!output) {
      failures.push(description);
      console.error(`[Verify]   ✗ ${description} exited 0 but printed nothing.`);
      continue;
    }

    if (args.length === 1 && args[0] === '--version') {
      versions.add(output);
    }
    console.log(`[Verify]   ✓ ${description}`);
  }
}

if (isolationDir) {
  rmSync(isolationDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`[Verify] ${failures.length} invocation(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}

if (versions.size !== 1) {
  console.error(`[Verify] entry points disagree on the version: ${[...versions].join(' vs ')}`);
  process.exit(1);
}

console.log(`[Verify] ✓ ${[...versions][0]} — ${entryPoints.length * COMMANDS.length} invocations`);
