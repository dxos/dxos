#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Compiles the local sandbox helper the desktop app bundles (`src/local/sidecar-main.ts`) into a
// single executable for the host platform at `dist/sidecar/dx-sandbox`.

import { type BunPlugin } from 'bun';
import { chmod, mkdir } from 'node:fs/promises';

const OUTFILE = 'dist/sidecar/dx-sandbox';

const NODE_STD_PREFIX = '@dxos/node-std/';
const NODE_STD_BUILTINS = ['assert', 'buffer', 'crypto', 'events', 'fs', 'fs/promises', 'path', 'stream', 'util'];

/**
 * Swaps `@dxos/node-std/<mod>` for the node builtin it re-exports, as the dx CLI's build does: Bun
 * miscompiles the shim's `export * from 'node:<mod>'`, and the binary dies with `node_<mod> is not defined`.
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

await mkdir('dist/sidecar', { recursive: true });
const result = await Bun.build({
  entrypoints: ['./src/local/sidecar-main.ts'],
  target: 'bun',
  plugins: [nodeStdPlugin],
  // Workspace packages resolve to their sources, so the helper builds without a prior `moon build`.
  conditions: ['source'],
  compile: { outfile: OUTFILE, autoloadBunfig: false },
});
if (!result.success) {
  console.error('[build-sidecar] failed:', result.logs);
  process.exit(1);
}
await chmod(OUTFILE, 0o755);
console.log(`[build-sidecar] ${OUTFILE}`);
