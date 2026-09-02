#!/usr/bin/env bun

//
// Copyright 2025 DXOS.org
//

import solidPlugin from '@opentui/solid/bun-plugin';
import type { BunPlugin } from 'bun';
import { existsSync } from 'fs';
import { chmod, copyFile, mkdir, rm, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';

/**
 * Bun plugin that handles Vite-style `?raw` suffix imports — `import code from 'pkg?raw'`
 * resolves the spec to a file path and inlines the file's contents as the default export.
 * Required because some workspace packages (e.g. `@dxos/echo-query`'s `query-sandbox.ts`)
 * use `?raw` to inline the bundled `query-lite` bundle as a string for QuickJS evaluation;
 * Vite-built consumers handle this natively, but Bun's resolver doesn't.
 */
const rawImportPlugin: BunPlugin = {
  name: 'raw-import',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      const basePath = args.path.replace(/\?raw$/, '');
      const importerDir = args.importer ? dirname(args.importer) : process.cwd();
      const resolved = Bun.resolveSync(basePath, importerDir);
      return { path: resolved, namespace: 'raw' };
    });
    build.onLoad({ filter: /.*/, namespace: 'raw' }, async (args) => {
      const contents = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: 'js',
      };
    });
  },
};

const URL_IMPORT_MIME_TYPES: Record<string, string> = {
  '.wasm': 'application/wasm',
};

/**
 * Bun plugin that handles Vite-style `?url` suffix imports — `import url from 'pkg/asset.wasm?url'`
 * inlines the asset as a `data:` URL. Required because `@dxos/plugin-script` imports
 * `esbuild-wasm/esbuild.wasm?url` and hands it to `initialize({ wasmURL })`; a compiled binary has
 * no sibling assets to point a URL at, and marking the import external only defers the failure to
 * startup (externals become plain requires inside Bun's embedded filesystem, which has no
 * `node_modules`). The MIME type is explicit because `WebAssembly.compileStreaming` rejects
 * anything but `application/wasm`.
 */
const urlImportPlugin: BunPlugin = {
  name: 'url-import',
  setup(build) {
    build.onResolve({ filter: /\?url$/ }, (args) => {
      const basePath = args.path.replace(/\?url$/, '');
      const importerDir = args.importer ? dirname(args.importer) : process.cwd();
      const resolved = Bun.resolveSync(basePath, importerDir);
      return { path: resolved, namespace: 'url' };
    });
    build.onLoad({ filter: /.*/, namespace: 'url' }, async (args) => {
      const mimeType = URL_IMPORT_MIME_TYPES[extname(args.path)] ?? 'application/octet-stream';
      const base64 = Buffer.from(await Bun.file(args.path).bytes()).toString('base64');
      return {
        contents: `export default ${JSON.stringify(`data:${mimeType};base64,${base64}`)};`,
        loader: 'js',
      };
    });
  },
};

const NODE_STD_PREFIX = '@dxos/node-std/';

/** Subpaths whose `node` condition resolves to a bare `export * from 'node:<mod>'` re-export. */
const NODE_STD_BUILTINS = ['assert', 'buffer', 'crypto', 'events', 'fs', 'fs/promises', 'path', 'stream', 'util'];

/**
 * Bun plugin that swaps `@dxos/node-std/<mod>` for the node builtin it re-exports. The shims exist
 * to give browser and workerd builds a replacement, which a bun target has no need for — and they
 * cannot be bundled: Bun miscompiles `export * from 'node:<mod>'` into `__reExport(exports, node_<mod>)`
 * against a namespace binding it never emits, so the binary dies with `node_<mod> is not defined`.
 * A `require` stub is used rather than resolving to `node:<mod>` directly, which Bun's resolver
 * rejects, or marking the import external, which leaves the unresolvable specifier in the binary.
 */
const nodeStdPlugin: BunPlugin = {
  name: 'node-std',
  setup(build) {
    build.onResolve({ filter: /^@dxos\/node-std\// }, (args) => {
      const subpath = args.path.slice(NODE_STD_PREFIX.length);
      return NODE_STD_BUILTINS.includes(subpath) ? { path: args.path, namespace: 'node-std' } : undefined;
    });
    build.onLoad({ filter: /.*/, namespace: 'node-std' }, (args) => ({
      contents: `module.exports = require('node:${args.path.slice(NODE_STD_PREFIX.length)}');\n`,
      loader: 'js',
    }));
  },
};

/**
 * Bun plugin that swaps `@automerge/automerge-subduction`'s `node` entry for its `web` entry.
 * The node entry `readFileSync`s the WASM module from a directory next to itself, which does not
 * exist inside Bun's embedded filesystem — the client fails to start with `ENOENT ... /$bunfs/
 * wasm_bindgen/automerge_subduction_wasm_bg.wasm`. The web entry inlines the same module as base64.
 */
const subductionWasmPlugin: BunPlugin = {
  name: 'subduction-wasm',
  setup(build) {
    build.onResolve({ filter: /^@automerge\/automerge-subduction$/ }, (args) => {
      const importerDir = args.importer ? dirname(args.importer) : process.cwd();
      const base64Entry = Bun.resolveSync(`${args.path}/wasm-base64`, importerDir);
      return { path: join(dirname(base64Entry), 'web.js') };
    });
  },
};

/**
 * Bun plugin that swaps `@automerge/automerge`'s `node` entry for its base64 entry. The node entry
 * reads its WASM with `readFileSync(`${__dirname}/automerge_wasm_bg.wasm`)`, and Bun resolves that
 * `__dirname` at bundle time — baking the build machine's `node_modules` path into the binary, which
 * then dies with `ENOENT ... automerge_wasm_bg.wasm` on every other machine. The base64 entry inlines
 * the same module, so the binary carries it.
 */
const automergeWasmPlugin: BunPlugin = {
  name: 'automerge-wasm',
  setup(build) {
    build.onResolve({ filter: /^@automerge\/automerge$/ }, (args) => {
      const importerDir = args.importer ? dirname(args.importer) : process.cwd();
      const nodeEntry = Bun.resolveSync(args.path, importerDir);
      return { path: join(dirname(nodeEntry), 'fullfat_base64.js') };
    });
  },
};

// Platform configurations. Every target needs its `@opentui/core-<platform>-<arch>` installed here —
// `@opentui/core` reaches its native library through a dynamic import interpolating
// `process.platform`/`process.arch`, which bun folds into a constant per target and resolves at
// bundle time — hence the devDependencies on all five, which pnpm otherwise installs for the host
// platform alone.
const platforms = [
  { target: 'bun-darwin-arm64', platform: 'darwin', arch: 'arm64', ext: '' },
  { target: 'bun-darwin-x64', platform: 'darwin', arch: 'x64', ext: '' },
  { target: 'bun-linux-arm64', platform: 'linux', arch: 'arm64', ext: '' },
  { target: 'bun-linux-x64', platform: 'linux', arch: 'x64', ext: '' },
  { target: 'bun-windows-x64', platform: 'win32', arch: 'x64', ext: '.exe' },
] as const;

// The compiler version is part of the artifact — 1.3.4 leaked `--smol` into `process.argv` so the binary
// rejected its own arguments — and CI resolved a bare `bun` from its image rather than the pin, because
// `setup-toolchain` runs with `auto-install: false` and no bun shim existed. Fail here rather than ship a
// binary built by an unpinned compiler.
const pinnedBun = (await Bun.file('../../../.prototools').text()).match(/^bun\s*=\s*"([^"]+)"/m)?.[1];
if (!pinnedBun) {
  console.error('[Build] No `bun` pin found in .prototools.');
  process.exit(1);
}
if (Bun.version !== pinnedBun) {
  console.error(`[Build] Running bun ${Bun.version} but .prototools pins ${pinnedBun}.`);
  console.error('[Build] Invoke through proto (`proto run bun -- ./scripts/build.ts`), as moon.yml does.');
  process.exit(1);
}

// Read version from source package.json.
const sourcePackage = await Bun.file('package.json').json();
const version = sourcePackage.version;

console.log(`[Build] Building cli v${version} for all platforms...`);

// Clean dist directory.
if (existsSync('dist')) {
  await rm('dist', { recursive: true });
}

// Create dist directory.
await mkdir('dist', { recursive: true });

// Build all platform binaries in parallel.
const buildPromises = platforms.map(async ({ target, platform, arch, ext }) => {
  const platformKey = `${platform}-${arch}`;
  const packageName = `@dxos/cli-${platformKey}`;
  const outDir = `dist/cli-${platformKey}`;
  const binaryName = `dx${ext}`;
  const outfile = join(outDir, binaryName);

  console.log(`[Build] Compiling ${packageName}...`);

  // Create output directory.
  await mkdir(outDir, { recursive: true });

  // Compile binary.
  const result = await Bun.build({
    entrypoints: ['./src/bin.ts'],
    target: 'bun',
    plugins: [solidPlugin, rawImportPlugin, urlImportPlugin, nodeStdPlugin, subductionWasmPlugin, automergeWasmPlugin],
    // Marks the binary so `--watch` selects the binary strategy: a binary has no sources for
    // `bun --watch` to track, so its supervisor re-runs the executable and watches dev-installed
    // plugins instead. Substituted while bundling rather than read from the environment at startup,
    // so nothing in the environment can flip it.
    define: {
      'globalThis.DX_CLI_BUNDLED': 'true',
      // The project a released binary reports to, injected by whoever builds it rather than
      // committed. A build without it reports nowhere, so a fork's binary cannot land in ours.
      'globalThis.DX_CLI_POSTHOG_TOKEN': JSON.stringify(process.env.DX_CLI_POSTHOG_API_KEY ?? ''),
    },
    compile: {
      target,
      outfile,
      autoloadBunfig: false,
    },
  });

  if (!result.success) {
    console.error(`[Build] Failed to compile ${packageName}:`, result.logs);
    throw new Error(`Build failed for ${packageName}`);
  }

  // The launcher execs this binary by path rather than through npm's `bin` field, so npm never
  // applies the executable bit on install — it has to survive from here into the tarball.
  await chmod(outfile, 0o755);

  // Copy LICENSE file.
  await copyFile('LICENSE', join(outDir, 'LICENSE'));

  // Generate platform-specific package.json.
  const platformPackage = {
    name: packageName,
    version,
    description: `${sourcePackage.description} - ${platform} ${arch}`,
    license: sourcePackage.license,
    author: sourcePackage.author,
    homepage: sourcePackage.homepage,
    bugs: sourcePackage.bugs,
    repository: sourcePackage.repository,
    os: [platform],
    cpu: [arch],
    main: `./${binaryName}`,
    // Installable on its own: npm must download a URL dependency's tarball to read its `os`/`cpu`,
    // so reaching the binary through the launcher's `optionalDependencies` fetches every platform.
    bin: { dx: `./${binaryName}` },
    files: [binaryName, 'LICENSE'],
    publishConfig: {
      access: 'public',
    },
  };

  await writeFile(join(outDir, 'package.json'), JSON.stringify(platformPackage, null, 2));

  console.log(`[Build] ✓ ${packageName}`);
});

await Promise.all(buildPromises);

// Generate main package.
console.log('[Build] Generating main package...');
const mainDir = 'dist/cli';
await mkdir(mainDir, { recursive: true });
await mkdir(join(mainDir, 'bin'), { recursive: true });

// Generate wrapper script.
const wrapperScript = `#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { chmodSync } = require('fs');
const { join } = require('path');

const PLATFORMS = {
  'darwin-arm64': '@dxos/cli-darwin-arm64',
  'darwin-x64': '@dxos/cli-darwin-x64',
  'linux-arm64': '@dxos/cli-linux-arm64',
  'linux-x64': '@dxos/cli-linux-x64',
  'win32-x64': '@dxos/cli-win32-x64',
};

const key = \`\${process.platform}-\${process.arch}\`;
const pkg = PLATFORMS[key];

if (!pkg) {
  console.error(\`Unsupported platform: \${key}\`);
  console.error('Supported platforms:', Object.keys(PLATFORMS).join(', '));
  process.exit(1);
}

try {
  const binary = process.platform === 'win32' ? 'dx.exe' : 'dx';
  const binPath = join(require.resolve(pkg), '..', binary);
  try {
    execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' });
  } catch (error) {
    // Recover from a packer that normalized the binary's mode (pnpm pack drops the executable bit).
    if (error.code !== 'EACCES') {
      throw error;
    }
    chmodSync(binPath, 0o755);
    execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' });
  }
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error(\`Platform-specific package not found: \${pkg}\`);
    console.error('Please reinstall @dxos/cli to get the correct platform binary.');
    process.exit(1);
  }
  throw error;
}
`;

await writeFile(join(mainDir, 'bin', 'dx.js'), wrapperScript, { mode: 0o755 });

// Copy LICENSE file.
await copyFile('LICENSE', join(mainDir, 'LICENSE'));

// Generate main package.json.
const optionalDependencies: Record<string, string> = {};
platforms.forEach(({ platform, arch }) => {
  const platformKey = `${platform}-${arch}`;
  const packageName = `@dxos/cli-${platformKey}`;
  optionalDependencies[packageName] = version;
});

const mainPackage = {
  name: sourcePackage.name,
  version,
  description: sourcePackage.description,
  homepage: sourcePackage.homepage,
  bugs: sourcePackage.bugs,
  repository: sourcePackage.repository,
  license: sourcePackage.license,
  author: sourcePackage.author,
  type: 'commonjs',
  bin: {
    dx: './bin/dx.js',
  },
  files: ['bin', 'LICENSE'],
  optionalDependencies,
  publishConfig: {
    access: 'public',
  },
};

await writeFile(join(mainDir, 'package.json'), JSON.stringify(mainPackage, null, 2));

console.log('[Build] ✓ Main package generated');
console.log('[Build] Build completed successfully!');
console.log(`[Build] Generated packages in dist/:`);
console.log(`  - cli (main package)`);
platforms.forEach(({ platform, arch }) => {
  console.log(`  - cli-${platform}-${arch}`);
});
