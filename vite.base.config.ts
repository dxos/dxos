//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
// Vite 8 ships rolldown as its bundler by default (no `rolldown-vite` shim needed).
import { defineConfig as viteDefineConfig, type Plugin, type UserConfig } from 'vite';

// Relative import — same rationale as vitest.base.config.ts: avoids moon dep cycle through @dxos/log.
import { DxosLogPlugin } from './tools/vite-plugin-log/src/plugin.ts';

// Mirror of `@dxos/node-std`'s `MODULES` list. Inlined to avoid a build-order cycle:
// importing from the package would require it to be built before any consumer can run `vite build`,
// which is impossible for node-std itself.
const NODE_STD_MODULES = [
  'fs/promises',
  'assert',
  'buffer',
  'crypto',
  'events',
  'fs',
  'path',
  'process',
  'stream',
  'util',
];

export interface DxViteOptions {
  /** Entry point(s). Default: 'src/index.ts'. */
  entry?: string | Record<string, string>;
  /** JS output dir. Default: 'dist/lib'. */
  outDir?: string;
  /** Skip DxNodeStdPlugin (for node-only packages that don't target browser). Default: false. */
  nodeTarget?: boolean;
  /** Vitest config to merge in (from createTestConfig). */
  test?: UserConfig['test'];
}

/**
 * Remaps node:* and bare Node.js built-ins to @dxos/node-std/* externals.
 * Lets browser consumers resolve polyfills via their app's alias config.
 * node:fs → @dxos/node-std/fs (external).
 */
export const DxNodeStdPlugin = (): Plugin => ({
  name: 'DxNodeStd',
  enforce: 'pre',
  resolveId(id) {
    const mod = id.startsWith('node:') ? id.slice(5) : id;
    if (NODE_STD_MODULES.includes(mod)) {
      return { id: `@dxos/node-std/${mod}`, external: true };
    }
  },
});

/**
 * Invokes dx-build (tsgo wrapper) after the JS bundle is written.
 * Generates per-file .d.ts files in dist/types/src/ — no bundling, no TS2883.
 */
export const DxTsgoPlugin = (): Plugin => ({
  name: 'DxTsgo',
  apply: 'build',
  closeBundle() {
    const result = spawnSync('pnpm', ['exec', 'dx-build'], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('dx-build (tsgo) failed');
    }
  },
});

/**
 * Creates a Vite UserConfig for a DXOS library package.
 *
 * JS output: dist/lib/*.mjs (all imports external — only local src is bundled).
 * DTS output: dist/types/src/**\/*.d.ts (via tsgo, run in closeBundle).
 */
export const defineConfig = (options: DxViteOptions = {}): UserConfig => {
  const { entry = 'src/index.ts', outDir = 'dist/lib', nodeTarget = false, test } = options;
  return viteDefineConfig({
    build: {
      lib: {
        entry,
        formats: ['es'],
        fileName: (_, name) => `${name}.mjs`,
      },
      outDir,
      sourcemap: true,
      minify: false,
      rollupOptions: {
        // All non-relative, non-absolute imports are external. We only bundle local source files.
        // This covers @dxos/*, effect, react, and everything else automatically —
        // no workspace-external plugin needed.
        external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
        output: {
          chunkFileNames: 'chunk-[name].mjs',
        },
      },
    },
    plugins: [
      ...(!nodeTarget ? [DxNodeStdPlugin()] : []),
      DxosLogPlugin({ logToFile: false, transform: { enabled: true } }),
      DxTsgoPlugin(),
    ],
    ...(test ? { test } : {}),
  });
};
