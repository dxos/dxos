//
// Copyright 2026 DXOS.org
//

import type { Plugin as EsbuildPlugin } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { dirname, join } from 'node:path';

/** The package conditions `vendor/` is built with: the ones Cloudflare's own bundler resolves. */
export const VENDOR_CONDITIONS = ['workerd', 'worker', 'browser', 'import', 'module', 'default'] as const;

export const VENDOR_MANIFEST = 'manifest.json';

/** What the Workers runtime provides; anything else a vendored package imports is bundled. */
const RUNTIME_MODULES = ['cloudflare:*', 'node:*'];

const NODE_BUILTIN = new RegExp(`^(${builtinModules.filter((name) => !name.startsWith('_')).join('|')})(/.*)?$`);

/** Imports Node built-ins as `node:<name>`, the form workerd's `nodejs_compat` provides them under. */
const nodeBuiltins = (): EsbuildPlugin => ({
  name: 'dx-vendor-node-builtins',
  setup: (build) => {
    build.onResolve({ filter: NODE_BUILTIN }, (args) => ({ path: `node:${args.path}`, external: true }));
  },
});

/** Styles and fonts a shared UI package imports; nothing in a Dynamic Worker can use them. */
const BROWSER_ASSETS = ['.css', '.pcss', '.scss', '.woff', '.woff2', '.ttf', '.otf'];

/**
 * One package the plugin keeps external, and the plugin's source modules that import it; `path` names its entry file
 * directly, for a package no importer resolves (e.g. the EDGE plugin host, which plugins do not depend on).
 */
export type VendorSpecifier = { specifier: string; importers: readonly string[]; path?: string };

export type BuildVendorOptions = {
  /** The plugin project; a specifier no importer resolves is resolved from here. */
  root: string;
  /** `<outDir>/vendor` of the plugin build. */
  outDir: string;
  specifiers: readonly VendorSpecifier[];
};

/** Entry name for a specifier; esbuild writes `vendor/<name>.mjs`. */
const ENTRY_PREFIX = 'dx-vendor:';

/**
 * Resolves each entry from a module that imports it: under pnpm a package bundled into the plugin can import a shared
 * package the plugin itself does not depend on, which then resolves only from that package's own directory.
 */
const resolveEntries = (specifiers: readonly VendorSpecifier[], root: string): EsbuildPlugin => ({
  name: 'dx-vendor-entries',
  setup: (build) => {
    const bySpecifier = new Map(specifiers.map((entry) => [entry.specifier, entry]));
    build.onResolve({ filter: new RegExp(`^${ENTRY_PREFIX}`) }, async (args) => {
      const specifier = args.path.slice(ENTRY_PREFIX.length);
      const path = bySpecifier.get(specifier)?.path;
      if (path !== undefined) {
        return { path };
      }
      const importers = bySpecifier.get(specifier)?.importers ?? [];
      const directories = [...new Set([...importers.map((file) => dirname(file)), root])];
      for (const resolveDir of directories) {
        const result = await build.resolve(specifier, { kind: 'entry-point', resolveDir });
        if (result.errors.length === 0) {
          return { path: result.path };
        }
      }
      return { errors: [{ text: `Cannot resolve ${specifier} from the plugin or the modules that import it.` }] };
    });
  },
});

/**
 * Builds `vendor/`: one ESM entry per specifier, at `vendor/<specifier>.mjs`, sharing chunks so each package is
 * loaded once, plus `vendor/manifest.json` mapping each specifier to its file. EDGE rewrites the plugin's bare
 * imports to these files, as Composer's import map resolves them in the browser.
 */
export const buildVendor = async ({ root, outDir, specifiers }: BuildVendorOptions): Promise<void> => {
  if (specifiers.length === 0) {
    return;
  }
  // Loaded here: a plugin built without a vendor step never needs esbuild.
  const { build } = await import('esbuild');
  await build({
    absWorkingDir: root,
    entryPoints: Object.fromEntries(specifiers.map(({ specifier }) => [specifier, `${ENTRY_PREFIX}${specifier}`])),
    outdir: outDir,
    outExtension: { '.js': '.mjs' },
    chunkNames: 'chunk-[hash]',
    assetNames: 'asset-[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'neutral',
    target: 'esnext',
    conditions: [...VENDOR_CONDITIONS],
    mainFields: ['module', 'main'],
    external: RUNTIME_MODULES,
    // Workerd imports a `.wasm` file as a `WebAssembly.Module`, so it stays a file beside the code that imports it.
    loader: { '.wasm': 'copy', ...Object.fromEntries(BROWSER_ASSETS.map((extension) => [extension, 'empty'])) },
    plugins: [resolveEntries(specifiers, root), nodeBuiltins()],
    // CommonJS dependencies keep their `require` calls in ESM output; workerd provides `require` only through `node:module`, and leaves `import.meta.url` unset, so the path is fixed.
    banner: {
      js: "import { createRequire as __dxCreateRequire } from 'node:module'; const require = __dxCreateRequire('/vendor/');",
    },
    sourcemap: true,
    logLevel: 'warning',
  });
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, VENDOR_MANIFEST),
    JSON.stringify(
      {
        specifiers: Object.fromEntries(specifiers.map(({ specifier }) => [specifier, `${specifier}.mjs`])),
        conditions: VENDOR_CONDITIONS,
      },
      null,
      2,
    ),
  );
};
