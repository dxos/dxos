#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

//
// Verifies the *packed* CLI, which is the only place two shipped defects were visible:
// the platform binary losing its executable bit during packing, and modules marked external
// in the compiled binary failing to resolve from Bun's embedded filesystem at startup.
// Neither is reachable by a test that runs against the source tree.
//

const platformKey = `${process.platform}-${process.arch}`;
const binaryName = process.platform === 'win32' ? 'dx.exe' : 'dx';

const mainDir = resolve('dist/cli');
const platformDir = resolve(`dist/cli-${platformKey}`);

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

// `@automerge/automerge`'s node entry reads its WASM from a sibling file, and Bun resolves the
// `__dirname` behind it at bundle time — baking in the build machine's path, so the binary runs here
// and dies with ENOENT anywhere else. Running it cannot catch that: this test builds and runs on one
// machine, as does CI, which is how it reached npm. Verified to match the binary that shipped it.
const AUTOMERGE_NODE_WASM_ENTRY = 'wasm_bindgen_output/nodejs';

const binaryBytes = Buffer.from(await Bun.file(join(platformDir, binaryName)).bytes());
if (binaryBytes.includes(AUTOMERGE_NODE_WASM_ENTRY)) {
  console.error(`[Smoke] ${binaryName} references "${AUTOMERGE_NODE_WASM_ENTRY}", read from disk at runtime.`);
  console.error("[Smoke] That path is the build machine's — redirect the package in scripts/build.ts.");
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'dx-smoke-'));

const run = (command: string, args: string[], cwd: string) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    console.error(`[Smoke] \`${command} ${args.join(' ')}\` failed (exit ${result.status ?? result.error}).`);
    console.error(result.stdout);
    console.error(result.stderr);
    rmSync(scratch, { recursive: true, force: true });
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

const checkVersion = (label: string, command: string, args: string[]): string => {
  console.log(`[Smoke] Running ${label}...`);
  const result = spawnSync(command, [...args, '--version'], { cwd: scratch, encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    console.error(`[Smoke] ${label} failed (exit ${result.status ?? result.error}).`);
    console.error(result.stdout);
    console.error(result.stderr);
    rmSync(scratch, { recursive: true, force: true });
    process.exit(1);
  }

  // Exiting zero is not enough: two silent successes compare equal below and pass without a version.
  const version = result.stdout.trim();
  if (!version) {
    console.error(`[Smoke] ${label} exited 0 but printed no version.`);
    console.error(result.stderr);
    rmSync(scratch, { recursive: true, force: true });
    process.exit(1);
  }
  return version;
};

// Both packages declare a `dx` bin and npm links only one of them, so each is invoked by path —
// going through `node_modules/.bin/dx` would silently drop either the launcher (its platform
// mapping and executable-bit recovery) or the standalone platform install from this test.
const launcherVersion = checkVersion('the launcher', 'node', [
  join(scratch, 'node_modules', '@dxos', 'cli', 'bin', 'dx.js'),
]);
const platformVersion = checkVersion(
  'the platform binary',
  join(scratch, 'node_modules', '@dxos', `cli-${platformKey}`, binaryName),
  [],
);

rmSync(scratch, { recursive: true, force: true });

if (launcherVersion !== platformVersion) {
  console.error(`[Smoke] launcher reported "${launcherVersion}" but the binary reported "${platformVersion}".`);
  process.exit(1);
}

console.log(`[Smoke] ✓ ${launcherVersion} (launcher and platform binary)`);
