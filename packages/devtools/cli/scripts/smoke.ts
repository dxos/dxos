#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

//
// Packs the CLI with `npm pack`, installs it from the tarballs, and hands the result to
// verify-installed.mjs. Every defect that made @dxos/cli@0.10.0 unrunnable was invisible to tests that
// exercise the source tree; this covers the tarball itself — file modes, the `files` array, the launcher's
// platform mapping and its `require.resolve`.
//
// What it cannot cover is a binary that resolves a path at bundle time, because that path still resolves on
// the machine that built it — which is where both this test and CI run it. `--hide` approximates a foreign
// machine via a mount namespace where the kernel permits it, and the `cli-foreign` CI job is the real
// article. Both call the same verifier so the checks cannot drift apart.
//

/** A plugin with one EDGE operation, which `describe()` must activate on workerd. */
const SAMPLE_PLUGIN: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'smoke-sample-plugin', version: '1.0.0', private: true, type: 'module' }),
  'dx.config.ts': [
    "import * as Plugin from '@dxos/app-framework/Plugin';",
    "import * as AppCapability from '@dxos/app-toolkit/AppCapability';",
    'export default Plugin.config({',
    "  plugin: { key: 'org.dxos.plugin.smokeSample', name: 'Smoke sample' },",
    "  modules: [AppCapability.operationHandler(() => import('./src/handler.ts', { with: { type: 'module-url' } }))],",
    '});',
  ].join('\n'),
  'vite.config.ts': [
    "import { composerPlugin } from '@dxos/app-framework/vite-plugin';",
    "export default { plugins: composerPlugin(), build: { outDir: 'dist', emptyOutDir: true } };",
  ].join('\n'),
  'src/handler.ts': [
    "import * as Effect from 'effect/Effect';",
    "import * as Schema from 'effect/Schema';",
    "import * as Capabilities from '@dxos/app-framework/Capabilities';",
    "import * as Capability from '@dxos/app-framework/Capability';",
    "import * as Operation from '@dxos/compute/Operation';",
    "import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';",
    "import { DXN } from '@dxos/keys';",
    'const Echo = Operation.make({',
    "  meta: { key: DXN.make('org.dxos.operation.smokeSample.echo'), name: 'Echo' },",
    '  input: Schema.Struct({ text: Schema.String }),',
    '  output: Schema.Struct({ text: Schema.String }),',
    '});',
    'const handlers = OperationHandlerSet.make(Echo.pipe(Operation.withHandler((input) => Effect.succeed(input))));',
    'export default Capability.makeModule(() =>',
    '  Effect.succeed(Capability.contribute(Capabilities.OperationHandler, handlers)),',
    ');',
  ].join('\n'),
};

/** Each package the sample plugin installs, and the workspace package whose `node_modules` it is linked from. */
const SAMPLE_PLUGIN_DEPENDENCIES = [
  ...['vite', 'react', 'react-dom'].map((name) => [name, 'packages/plugins/plugin-registry']),
  ['effect', 'packages/devtools/cli'],
  ...['app-framework', 'app-toolkit', 'compute', 'keys', 'plugin-builder', 'plugin-host-cloudflare'].map((name) => [
    `@dxos/${name}`,
    'packages/devtools/cli',
  ]),
];

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

// The checks themselves live in verify-installed.mjs, which the `cli-foreign` CI job also runs — on a
// machine with no checkout, where the tree that built the binary is genuinely absent. One copy, two
// environments; `--hide` approximates the second one here when the kernel permits it.
const verify = spawnSync(process.execPath, [resolve('scripts/verify-installed.mjs'), scratch, '--hide', nodeModules], {
  encoding: 'utf8',
  stdio: 'inherit',
});

if (verify.status !== 0) {
  cleanup();
  process.exit(verify.status ?? 1);
}

// `dx registry publish` builds a plugin with the Vite the plugin project installs, imported into the binary's own
// process, which only a compiled binary can break: it resolves nothing outside its embedded files unless built to,
// and bun lists packages like `ws` as builtins, which `vendor/` must not take for workerd's.
console.log('[Smoke] Building a plugin with the installed binary...');
const pluginDir = join(scratch, 'plugin');
mkdirSync(join(pluginDir, 'src'), { recursive: true });
mkdirSync(join(pluginDir, 'node_modules', '@dxos'), { recursive: true });
for (const [file, content] of Object.entries(SAMPLE_PLUGIN)) {
  writeFileSync(join(pluginDir, file), content);
}
// The plugin's dependencies, linked from the workspace's install; vite is not a dependency of the CLI itself.
for (const [name, fromPackage] of SAMPLE_PLUGIN_DEPENDENCIES) {
  const source = join(workspaceRoot, fromPackage, 'node_modules', name);
  if (!existsSync(source)) {
    console.error(`[Smoke] ✗ ${name} is not installed at ${source}`);
    cleanup();
    process.exit(1);
  }
  symlinkSync(realpathSync(source), join(pluginDir, 'node_modules', name));
}
const published = run(
  join(scratch, 'node_modules', '@dxos', `cli-${platformKey}`, binaryName),
  ['registry', 'publish', '--dir', pluginDir, '--dry-run'],
  pluginDir,
);
console.log(
  published.stdout
    .split('\n')
    .filter((line) => /^(Building|Described|Dry run):/.test(line))
    .join('\n'),
);
const manifest = JSON.parse(readFileSync(join(pluginDir, 'dist', 'manifest.json'), 'utf8'));
if (manifest.key !== 'org.dxos.plugin.smokeSample') {
  console.error(`[Smoke] The plugin build wrote a manifest for ${manifest.key}.`);
  cleanup();
  process.exit(1);
}
console.log('[Smoke] ✓ dx registry publish --dry-run built and described the plugin');

cleanup();
