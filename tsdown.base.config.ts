//
// Copyright 2026 DXOS.org
//
// Shared tsdown config factory for all DXOS packages.
// Usage: import { defineConfig } from '../../tsdown.base.config';
// (adjust relative path based on package depth)
//

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type UserConfig } from 'tsdown';

// NOTE: Imported by relative path on purpose. Going through `@dxos/vite-plugin-log`
// would force every ts-build package to compile the plugin first, which introduces
// a moon project-graph cycle through @dxos/log (log is ts-build → depends on vite-plugin-log
// → log is a peer dep of vite-plugin-log → cycle). Importing from source lets unrun
// (tsdown's config loader) bundle and execute it directly with no moon dep.
import { DEFAULT_LOG_META_TRANSFORM_SPEC } from './tools/vite-plugin-log/src/definitions.ts';
import { rolldownLogMetaPlugin } from './tools/vite-plugin-log/src/rolldown-log-meta-plugin.ts';

export { DEFAULT_LOG_META_TRANSFORM_SPEC } from './tools/vite-plugin-log/src/definitions.ts';
export { rolldownLogMetaPlugin } from './tools/vite-plugin-log/src/rolldown-log-meta-plugin.ts';

export interface DxTsdownOptions {
  /**
   * Entry points to build (default: ['src/index.ts']).
   */
  entry?: string[];
  /**
   * Target platforms (default: ['browser', 'node']).
   */
  platform?: Array<'browser' | 'node' | 'neutral'>;
  /**
   * Inject @dxos/node-std/globals into browser output (default: false).
   */
  injectGlobals?: boolean;
  /**
   * Import Buffer/process/global from @dxos/node-std (default: false).
   */
  importGlobals?: boolean;
  /**
   * npm packages to inline into the bundle (default: []).
   */
  bundlePackages?: string[];
  /**
   * JS output base directory (default: 'dist/lib').
   */
  outputPath?: string;
}

// Node globals shimmed for browser environments.
const NODE_GLOBALS = ['global', 'Buffer', 'process'] as const;

// Node built-in modules that @dxos/node-std provides browser shims for.
// Keep in sync with packages/common/node-std/src/_/config.js.
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

/**
 * Rewrites `node:xxx` and bare built-in imports (e.g. `util`, `events`) to
 * `@dxos/node-std/xxx` in browser builds, matching the behaviour of esbuild's
 * NodeExternalPlugin.  The remapped specifiers are marked external so rolldown
 * does not attempt to bundle them — the downstream Vite/esbuild app provides
 * the actual shim via its own aliases.
 *
 * Bare module names that appear in bundlePackages are skipped so packages like
 * @dxos/node-std can still inline the npm polyfill rather than self-referencing.
 */
export const nodeStdPlugin = (bundlePackages: string[] = []) =>
  ({
    name: 'dx-node-std',
    resolveId: {
      order: 'pre' as const,
      handler(id: string) {
        if (id.startsWith('node:')) {
          const mod = id.slice(5);
          if (NODE_STD_MODULES.includes(mod)) {
            return { id: `@dxos/node-std/${mod}`, external: true };
          }
        }
        // Only remap bare names that are NOT explicitly being bundled by this package.
        if (NODE_STD_MODULES.includes(id) && !bundlePackages.includes(id)) {
          return { id: `@dxos/node-std/${id}`, external: true };
        }
      },
    },
  }) as any;

/**
 * Marks all @dxos/* workspace packages as external before rolldown resolves them.
 *
 * rolldown follows pnpm symlinks to their real paths (e.g. node_modules/@dxos/keys
 * → packages/common/keys/src/index.ts). The real path doesn't contain "node_modules",
 * so skipNodeModulesBundle's regex check misses it and the package gets bundled.
 * This plugin intercepts at the specifier level — before any path resolution — and
 * returns external:true for all @dxos/* imports that are not explicitly bundled.
 */
export const workspaceExternalPlugin = (bundlePkgs: string[]) =>
  ({
    name: 'dx-workspace-external',
    resolveId: {
      order: 'pre' as const,
      handler(id: string) {
        if (id.startsWith('@dxos/') && !bundlePkgs.some((p) => id === p || id.startsWith(`${p}/`))) {
          return { id, external: true };
        }
      },
    },
  }) as any;

/**
 * Prepends `import "@dxos/node-std/globals"` to every browser output chunk.
 * Equivalent to dx-compile's --injectGlobals flag.
 */
export const injectGlobalsPlugin = () =>
  ({
    name: 'dx-inject-globals',
    renderChunk(code: string) {
      return { code: 'import "@dxos/node-std/globals";\n' + code };
    },
  }) as any;

/**
 * Handles `?raw` import suffixes (Vite convention) by loading the file as a
 * plain string and re-exporting it as the default export.
 *
 * Supports both relative paths (`./shader.glsl?raw`) and package subpath
 * imports (`#query-lite?raw`) by delegating non-relative specifiers to
 * rolldown's own resolver before wrapping the result.
 */
export const rawImportPlugin = () =>
  ({
    name: 'dx-raw-import',
    resolveId: {
      order: 'pre' as const,
      async handler(this: any, id: string, importer?: string) {
        if (!id.endsWith('?raw')) {
          return;
        }
        const cleanId = id.slice(0, -4);
        // For bare specifiers and package subpath imports (#...) delegate to
        // rolldown's resolver so package.json "imports" / "exports" are honoured.
        if (!cleanId.startsWith('.') && !cleanId.startsWith('/')) {
          const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
          if (!resolved || resolved.external) {
            return;
          }
          // Append .mjs so the virtual ID doesn't end in a CSS extension and @tsdown/css skips it.
          return { id: `\0raw:${resolved.id}.mjs` };
        }
        // Relative or absolute path — compute directly.
        const base = importer ? dirname(importer.replace(/\?.*/, '')) : process.cwd();
        const resolved = cleanId.startsWith('/') ? cleanId : join(base, cleanId);
        return { id: `\0raw:${resolved}.mjs` };
      },
    },
    load: {
      async handler(id: string) {
        if (!id.startsWith('\0raw:')) {
          return;
        }
        // Strip the .mjs suffix added to prevent @tsdown/css from processing the virtual ID.
        const filePath = id.slice(5, -4);
        const content = await readFile(filePath, 'utf8');
        return { code: `export default ${JSON.stringify(content)}` };
      },
    },
  }) as any;

/**
 * Handles `?url` import suffixes by resolving the file path and returning it
 * as a string export. This mirrors Vite's ?url handling for build contexts.
 */
export const urlImportPlugin = () =>
  ({
    name: 'dx-url-import',
    resolveId: {
      async handler(this: any, id: string, importer?: string) {
        if (!id.endsWith('?url')) {
          return;
        }
        const cleanId = id.slice(0, -4);
        if (!cleanId.startsWith('.') && !cleanId.startsWith('/')) {
          const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
          if (!resolved || resolved.external) {
            return;
          }
          return { id: `\0url:${resolved.id}` };
        }
        const base = importer ? dirname(importer.replace(/\?.*/, '')) : process.cwd();
        const resolved = cleanId.startsWith('/') ? cleanId : join(base, cleanId);
        return { id: `\0url:${resolved}` };
      },
    },
    load: {
      async handler(id: string) {
        if (!id.startsWith('\0url:')) {
          return;
        }
        const filePath = id.slice(5);
        const fileName = filePath.split('/').pop()!;
        return { code: `export default ${JSON.stringify(fileName)}` };
      },
    },
  }) as any;

const sharedConfig = (bundlePackages: string[]): Partial<UserConfig> => ({
  // tsdown 0.22: skipNodeModulesBundle and alwaysBundle are mutually exclusive.
  // When bundling specific packages (e.g. node-std polyfills), use alwaysBundle only.
  // When not bundling any packages, use skipNodeModulesBundle to keep node_modules external.
  deps: bundlePackages.length > 0
    ? {
        // Include trailing-slash variants (e.g. 'util/') alongside 'util'.
        alwaysBundle: [...bundlePackages, ...bundlePackages.map((p) => `${p}/`)],
      }
    : { skipNodeModulesBundle: true },
  dts: false,
  report: false,
  fixedExtension: true,
  hash: false,
  clean: false,
  sourcemap: true,
  // Prefix internal rolldown chunks with "chunk-" so they never clash
  // case-insensitively with entry-point output files (e.g. ref.mjs vs Ref.mjs).
  outputOptions: { chunkFileNames: 'chunk-[name].mjs' },
});

/**
 * Creates tsdown UserConfig array for a DXOS package.
 *
 * Includes all standard DXOS plugins (workspace-external, raw-import, url-import,
 * log-meta). JS output goes to dist/lib/. Type declarations are generated separately
 * by dx-build (tsgo CLI) via the moon `build` task, producing per-file .d.ts files in
 * dist/types/src/ — this avoids rolldown-plugin-dts chunking and the TS2883 errors it
 * causes when packages have multiple entry points.
 */
export const defineConfig = (options: DxTsdownOptions = {}): UserConfig[] => {
  const {
    entry = ['src/index.ts'],
    platform = ['browser', 'node'],
    injectGlobals = false,
    importGlobals = false,
    bundlePackages = [],
    outputPath = 'dist/lib',
  } = options;

  const logPlugin = rolldownLogMetaPlugin({ to_transform: DEFAULT_LOG_META_TRANSFORM_SPEC }) as any;
  const wsExternalPlugin = workspaceExternalPlugin(bundlePackages);
  const rawPlugin = rawImportPlugin();
  const urlPlugin = urlImportPlugin();

  const base = sharedConfig(bundlePackages);
  const configs: UserConfig[] = [];

  if (platform.includes('browser')) {
    const nodeStd = nodeStdPlugin(bundlePackages);
    const browserPlugins: any[] = [nodeStd, rawPlugin, urlPlugin, wsExternalPlugin, logPlugin];
    if (injectGlobals) {
      browserPlugins.push(injectGlobalsPlugin());
    }

    configs.push({
      ...base,
      entry,
      platform: 'browser',
      format: 'esm',
      outDir: `${outputPath}/browser`,
      plugins: browserPlugins,
      ...(importGlobals
        ? {
            inputOptions: {
              transform: {
                inject: Object.fromEntries(
                  NODE_GLOBALS.map((g) => [g, [`@dxos/node-std/inject-globals`, g] as [string, string]]),
                ),
              },
            },
          }
        : {}),
    });
  }

  if (platform.includes('node')) {
    configs.push({
      ...base,
      entry,
      platform: 'node',
      format: 'esm',
      outDir: `${outputPath}/node-esm`,
      plugins: [rawPlugin, urlPlugin, wsExternalPlugin, logPlugin],
    });
  }

  if (platform.includes('neutral')) {
    const nodeStdNeutral = nodeStdPlugin(bundlePackages);
    configs.push({
      ...base,
      entry,
      platform: 'neutral',
      format: 'esm',
      outDir: `${outputPath}/neutral`,
      plugins: [nodeStdNeutral, rawPlugin, urlPlugin, wsExternalPlugin, logPlugin],
    });
  }

  return configs;
};
