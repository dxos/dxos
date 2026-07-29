#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

//
// Verifies the CLI the way a user gets it: packed with `npm pack`, installed from the tarballs, and run
// with the workspace's `node_modules` replaced by an empty directory. Every defect that made
// @dxos/cli@0.10.0 unrunnable was invisible to tests that exercise the source tree, and two of them were
// invisible even to a packed-and-installed run, because a path resolved at bundle time still resolves on
// the machine that built the binary — which is where both this test and CI run it.
//
// The two axes are separate and both required: packing and installing covers the tarball (file modes, the
// `files` array, the launcher's platform mapping and its `require.resolve`), while hiding `node_modules`
// covers self-containment (`@automerge/automerge` reading its WASM from a `__dirname`-derived path,
// `classic-level` binding a native addon). The scratch install lives under the temp directory, so hiding
// the workspace's `node_modules` leaves it intact.
//

/** `--help`-shaped so nothing touches the network or a real profile; these failures are all at import. */
const COMMANDS = [['--version'], ['--help'], ['registry', '--help'], ['function', '--help'], ['space', '--help']];

const BIND_FAILED = 42;
const NAMESPACE_SCRIPT = 'mount --bind "$1" "$2" || exit 42; shift 2; exec "$@"';

const platformKey = `${process.platform}-${process.arch}`;
const binaryName = process.platform === 'win32' ? 'dx.exe' : 'dx';

const mainDir = resolve('dist/cli');
const platformDir = resolve(`dist/cli-${platformKey}`);
const workspaceRoot = resolve('../../..');
const nodeModules = join(workspaceRoot, 'node_modules');

for (const dir of [mainDir, platformDir]) {
  if (!existsSync(dir)) {
    console.error(`[Smoke] ${dir} not found. Run \`moon run cli:bundle\` first.`);
    process.exit(1);
  }
}

const version = (await Bun.file(join(mainDir, 'package.json')).json()).version;
console.log(`[Smoke] Verifying @dxos/cli@${version} for ${platformKey}...`);

// The launcher execs the binary by path, so nothing downstream will make it executable for us.
const mode = statSync(join(platformDir, binaryName)).mode;
if (process.platform !== 'win32' && (mode & 0o111) === 0) {
  console.error(`[Smoke] ${join(platformDir, binaryName)} is not executable (mode ${(mode & 0o777).toString(8)}).`);
  process.exit(1);
}

// Named check for the automerge entry, because it is the only self-containment coverage on a host without
// mount namespaces. Verified to match the binary that shipped the defect.
const AUTOMERGE_NODE_WASM_ENTRY = 'wasm_bindgen_output/nodejs';
const binaryBytes = Buffer.from(await Bun.file(join(platformDir, binaryName)).bytes());
if (binaryBytes.includes(AUTOMERGE_NODE_WASM_ENTRY)) {
  console.error(`[Smoke] ${binaryName} references "${AUTOMERGE_NODE_WASM_ENTRY}", read from disk at runtime.`);
  console.error("[Smoke] That path is the build machine's — redirect the package in scripts/build.ts.");
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'dx-smoke-'));
const cleanup = () => rmSync(scratch, { recursive: true, force: true });

const run = (command: string, args: string[], cwd: string) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    console.error(`[Smoke] \`${command} ${args.join(' ')}\` failed (exit ${result.status ?? result.error}).`);
    console.error(result.stdout);
    console.error(result.stderr);
    cleanup();
    process.exit(1);
  }
  return result;
};

// `npm pack` (not `pnpm pack`) — the packer must be the one `scripts/publish.ts` uses, because
// pnpm's strips file modes and that difference is exactly what this test guards.
const pack = (dir: string): string => {
  const result = run('npm', ['pack', '--silent', '--pack-destination', scratch], dir);
  return join(scratch, result.stdout.trim().split('\n').pop()!);
};

console.log('[Smoke] Packing tarballs...');
const platformTarball = pack(platformDir);
const mainTarball = pack(mainDir);

// Install both tarballs side by side. `--omit=optional` skips the registry lookup for the
// platform packages declared in optionalDependencies — this version isn't published yet, and
// the tarball installed alongside is what `require.resolve` finds.
console.log('[Smoke] Installing tarballs...');
writeFileSync(join(scratch, 'package.json'), JSON.stringify({ name: 'dx-smoke', private: true }, null, 2));
run('npm', ['install', '--no-audit', '--no-fund', '--omit=optional', platformTarball, mainTarball], scratch);

// `--map-root-user` so an unprivileged user can still create the namespace and bind-mount inside it.
const isolationDir = mkdtempSync(join(tmpdir(), 'dx-empty-'));
const wrap = (command: string, args: string[]): [string, string[]] => [
  'unshare',
  ['-m', '--map-root-user', 'bash', '-c', NAMESPACE_SCRIPT, '--', isolationDir, nodeModules, command, ...args],
];

const probe = spawnSync(...wrap('true', []), { encoding: 'utf8', env: process.env });
const isolated = process.platform === 'linux' && !probe.error && probe.status !== BIND_FAILED;
if (isolated) {
  console.log(`[Smoke] Running with ${nodeModules} hidden.`);
} else {
  console.log(`[Smoke] Mount namespaces unavailable — running without hiding ${nodeModules}.`);
}

const invoke = (command: string, args: string[]) => {
  const [resolved, resolvedArgs] = isolated ? wrap(command, args) : [command, args];
  return spawnSync(resolved, resolvedArgs, { cwd: scratch, encoding: 'utf8', env: process.env });
};

// Both packages declare a `dx` bin and npm links only one of them, so each is invoked by path — going
// through `node_modules/.bin/dx` would silently drop either the launcher (its platform mapping and
// executable-bit recovery) or the standalone platform install from this test.
const entryPoints = [
  { label: 'launcher', command: 'node', prefix: [join(scratch, 'node_modules', '@dxos', 'cli', 'bin', 'dx.js')] },
  {
    label: 'platform binary',
    command: join(scratch, 'node_modules', '@dxos', `cli-${platformKey}`, binaryName),
    prefix: [] as string[],
  },
];

const versions = new Set<string>();
const failures: string[] = [];

for (const { label, command, prefix } of entryPoints) {
  for (const args of COMMANDS) {
    const description = `${label}: dx ${args.join(' ')}`;
    const result = invoke(command, [...prefix, ...args]);
    if (result.status !== 0) {
      failures.push(description);
      console.error(`[Smoke]   ✗ ${description} (exit ${result.status ?? result.error})`);
      const lines = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').filter((line) => line.trim());
      // Prefer the lines that name a cause, but never swallow the output when none of them match — an
      // unrecognised failure is exactly the one worth seeing.
      const diagnostic = lines.filter((line) => /error|ENOENT|No native build|loaded from|Cannot find/i.test(line));
      const shown = diagnostic.length > 0 ? diagnostic.slice(0, 4) : lines.slice(-8);
      console.error(
        shown.length > 0
          ? shown.map((line) => `[Smoke]     ${line.trim()}`).join('\n')
          : '[Smoke]     (no output on stdout or stderr)',
      );
      continue;
    }

    // Exiting zero is not enough: a silent success would otherwise pass without proving anything ran.
    const output = result.stdout.trim();
    if (!output) {
      failures.push(description);
      console.error(`[Smoke]   ✗ ${description} exited 0 but printed nothing.`);
      continue;
    }

    if (args.length === 1 && args[0] === '--version') {
      versions.add(output);
    }
    console.log(`[Smoke]   ✓ ${description}`);
  }
}

cleanup();
rmSync(isolationDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`[Smoke] ${failures.length} invocation(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}

if (versions.size !== 1) {
  console.error(`[Smoke] entry points disagree on the version: ${[...versions].join(' vs ')}`);
  process.exit(1);
}

console.log(`[Smoke] ✓ ${[...versions][0]} — ${entryPoints.length * COMMANDS.length} invocations`);
