//
// Copyright 2026 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { execFile } from 'node:child_process';
import path, { join } from 'node:path';
import { promisify } from 'node:util';
import pkgUp from 'pkg-up';
// Vite 8 ships rolldown as its bundler by default (no `rolldown-vite` shim needed).
import { defineConfig as viteDefineConfig, type Plugin, type UserConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';
import solid from 'vite-plugin-solid';
import WasmPlugin from 'vite-plugin-wasm';
import { UserWorkspaceConfig, type ViteUserConfig, defineProject } from 'vitest/config';
import type { Reporter, TestModule, TestRunEndReason } from 'vitest/node';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import PluginImportSource from '@dxos/vite-plugin-import-source';

// NOTE: Imported by relative path on purpose. Going through `@dxos/vite-plugin-log`
// would force every package's `:test`/`:test-browser`/`:test-storybook` task to
// build the plugin first, which introduces a moon dep cycle through @dxos/log
// (vite-plugin-log -> log -> ... -> log:test -> vite-plugin-log).
import { DxosLogPlugin } from './tools/vite-plugin-log/src/plugin.ts';
import { TEST_TAGS } from './vitest.tags';

export { TEST_TAGS };

// Mirror of `@dxos/node-std`'s `MODULES` list. Inlined to avoid a build-order cycle:
// importing from the package would require it to be built before any consumer can run
// `vite build`, which is impossible for node-std itself.
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

const isDebug = !!process.env.VITEST_DEBUG;
const xmlReport = Boolean(process.env.VITEST_XML_REPORT);
const DEBUG_TIMEOUT_MS = 3_600_000;

// Node-only Vitest NDJSON file sink (@dxos/vite-plugin-log/vitest). Relative paths avoid a moon dep cycle.
const VITEST_LOG_GLOBAL_SETUP = new URL('./tools/vite-plugin-log/src/vitest/global-setup.ts', import.meta.url).pathname;
const VITEST_LOG_SETUP = new URL('./tools/vite-plugin-log/src/vitest/setup.ts', import.meta.url).pathname;

// Browser tests have no filesystem, so `@dxos/log` entries are POSTed to the `DxosLogPlugin` dev-server
// sink (page realm installs the runtime via this setup file; worker realms via the plugin's worker-entry
// injection). Output lands in `<package>/test-browser.log` (NDJSON, `query-logs`-compatible).
const VITEST_BROWSER_LOG_SETUP = new URL('./tools/vite-plugin-log/src/vitest/browser-setup.ts', import.meta.url)
  .pathname;
const BROWSER_LOG_FILE = 'test-browser.log';
const BROWSER_LOG_FILTER = process.env.DX_TEST_LOG_FILTER ?? process.env.LOG_FILTER ?? 'debug';

// Browser/storybook tests transitively import `@anthropic-ai/tokenizer` via
// `@dxos/ai`, which pulls in `tiktoken/lite` — a WASM bundle whose top-level
// `await` cannot be rewrapped by esbuild's dep pre-bundler. Composer-app's
// vite.config.ts aliases it to an empty stub for the same reason. None of
// the browser tests actually tokenize, so the alias is safe.
const TIKTOKEN_STUB = new URL('./vitest/tiktoken-stub.mjs', import.meta.url).pathname;
const TIKTOKEN_ALIAS = { 'tiktoken/lite': TIKTOKEN_STUB };

// Default Workers runtime compatibility for the opt-in `workerd` vitest project. `nodejs_compat`
// exposes the Node.js built-ins (`node:crypto`, `node:buffer`, …) that @dxos packages resolve to,
// mirroring what production DXOS functions run against on Cloudflare. Overridable per package.
const WORKERD_COMPATIBILITY_DATE = '2024-11-01';
const WORKERD_COMPATIBILITY_FLAGS = ['nodejs_compat'];

// ---------------------------------------------------------------------------
// Library build plugins
// ---------------------------------------------------------------------------

/**
 * Remaps `node:*` and bare Node.js built-ins to `@dxos/node-std/*` externals.
 * Lets browser consumers resolve polyfills via their app's alias config.
 */
export const DxNodeStdPlugin = (): Plugin => ({
  name: 'DxNodeStd',
  enforce: 'pre',
  resolveId(id) {
    if (id.startsWith('node:')) {
      const mod = id.slice(5);
      if (NODE_STD_MODULES.includes(mod)) {
        return { id: `@dxos/node-std/${mod}`, external: true };
      }
      // Other `node:*` (child_process, http, os, net, …) stay as `node:*` literals
      // so downstream bundlers (esbuild, the consuming app's vite) can decide how to
      // resolve them. Returning `id` here defeats vite's library-mode default that
      // rewrites them to the unloadable `__vite-browser-external` placeholder.
      return { id, external: true };
    }
    if (NODE_STD_MODULES.includes(id)) {
      return { id: `@dxos/node-std/${id}`, external: true };
    }
  },
});

/**
 * Emits `?url` / `?inline` asset imports as separate files in `dist/lib/assets/` instead of
 * base64-inlining them into the JS bundle. Leaves `?raw` alone — those import the file's
 * text content as a string literal and are handled by vite's built-in `?raw` loader.
 *
 * Vite's library mode (`build.lib`) ignores `assetsInlineLimit` for `?url` imports and
 * always returns a base64 data URI — fine for small icons, ruinous for the 50 MB of
 * `.m4a` soundscapes in @dxos/plugin-zen. This plugin runs `enforce: 'pre'` so it
 * intercepts the import before vite's asset handler does. The output is a small JS
 * module that re-exports the emitted URL via `import.meta.ROLLUP_FILE_URL_*`, which
 * resolves to the relative path of the emitted asset at consumer-bundling time.
 */
export const DxRawAssetsPlugin = (): Plugin => {
  const ASSET_QUERY = /\?(url|inline)(?:$|&)/;
  return {
    name: 'DxRawAssets',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!ASSET_QUERY.test(id)) {
        return null;
      }
      // Resolve the file relative to its importer so the next `load` can read it.
      const cleanId = id.replace(/\?.*$/, '');
      const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
      if (!resolved) {
        return null;
      }
      return `${resolved.id}${id.slice(cleanId.length)}\0?dx-raw-asset`;
    },
    async load(id) {
      if (!id.endsWith('\0?dx-raw-asset')) {
        return null;
      }
      const filePath = id.slice(0, -'\0?dx-raw-asset'.length).replace(/\?.*$/, '');
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const source = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const refId = this.emitFile({ type: 'asset', name: fileName, source });
      // `import.meta.ROLLUP_FILE_URL_<refId>` resolves to the relative URL of the
      // emitted asset at chunk-render time.
      return `export default import.meta.ROLLUP_FILE_URL_${refId};`;
    },
  };
};

const execFileAsync = promisify(execFile);

const runDxBuild = async (): Promise<void> => {
  try {
    const { stdout, stderr } = await execFileAsync('pnpm', ['exec', 'dx-build']);
    if (stdout.length > 0) {
      process.stdout.write(stdout);
    }
    if (stderr.length > 0) {
      process.stderr.write(stderr);
    }
  } catch (error) {
    // execFileAsync captures the subprocess stdio on the rejected value; without this,
    // rolldown swallows tsgo's actual diagnostic output and the plugin error carries only
    // a generic exit-code message.
    const err = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    if (err.stdout && err.stdout.length > 0) {
      process.stdout.write(err.stdout);
    }
    if (err.stderr && err.stderr.length > 0) {
      process.stderr.write(err.stderr);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`dx-build (tsgo) failed: ${message} cwd=${process.cwd()}`);
  }
};

/**
 * Rewrites bare specifiers in `new Worker(new URL('@dxos/...', import.meta.url))` /
 * `new SharedWorker(...)` patterns to absolute file paths so vite's built-in
 * `vite:worker-import-meta-url` plugin can resolve them.
 *
 * Vite's worker plugin treats the URL argument as a filesystem path relative to
 * the importer, not as a module specifier. Bare specifiers like
 * `@dxos/client/dedicated-worker` end up interpreted as
 * `src/testing/@dxos/client/dedicated-worker` and fail to resolve. This plugin
 * pre-resolves such specifiers through vite's normal module resolver and
 * substitutes the resolved absolute path into the source before the worker
 * plugin scans it.
 */
export const DxWorkerResolvePlugin = (): Plugin => {
  const NEW_WORKER =
    /new\s+(?:Shared)?Worker\s*\(\s*new\s+URL\s*\(\s*['"](@dxos\/[^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;
  // Cache resolved (packageDir, source-relative) per package to avoid re-reading package.json.
  const pkgSourceCache = new Map<string, Record<string, string>>();
  return {
    name: 'DxWorkerResolve',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(id)) {
        return null;
      }
      if (!code.includes('new URL(') || !code.includes('@dxos/')) {
        return null;
      }
      const matches = Array.from(code.matchAll(NEW_WORKER));
      if (matches.length === 0) {
        return null;
      }
      const nodePath = await import('node:path');
      const nodeFs = await import('node:fs/promises');
      const readPkgSources = async (pkgDir: string): Promise<Record<string, string>> => {
        if (pkgSourceCache.has(pkgDir)) {
          return pkgSourceCache.get(pkgDir)!;
        }
        const out: Record<string, string> = {};
        try {
          const raw = await nodeFs.readFile(nodePath.join(pkgDir, 'package.json'), 'utf8');
          const pkg = JSON.parse(raw) as { name?: string; exports?: unknown };
          const walk = (node: unknown, key: string) => {
            if (typeof node === 'string') {
              if (key.endsWith('.source') && node.startsWith('./')) {
                const subpath = key.split('.').slice(1, -1).join('.') || '.';
                out[subpath] = node.slice(2);
              }
            } else if (node && typeof node === 'object') {
              for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                walk(v, `${key}.${k}`);
              }
            }
          };
          walk(pkg.exports ?? {}, '');
        } catch {}
        pkgSourceCache.set(pkgDir, out);
        return out;
      };

      let out = code;
      for (const m of matches) {
        const specifier = m[1];
        // Only rewrite self-references (`@dxos/<current-package>/<sub>`); external `@dxos/*`
        // workers are handled by the consuming app's bundler.
        const [, pkgName, ...subParts] = specifier.split('/');
        const subpath = './' + subParts.join('/');
        // Walk up from the source file to find the nearest package.json whose name matches.
        let dir = nodePath.dirname(id);
        let pkgDir: string | null = null;
        while (dir !== nodePath.dirname(dir)) {
          try {
            const pkg = JSON.parse(await nodeFs.readFile(nodePath.join(dir, 'package.json'), 'utf8'));
            if (pkg.name === `@dxos/${pkgName}`) {
              pkgDir = dir;
              break;
            }
          } catch {}
          dir = nodePath.dirname(dir);
        }
        if (!pkgDir) {
          continue;
        }
        const sources = await readPkgSources(pkgDir);
        const srcRel = sources[subpath];
        if (!srcRel) {
          continue;
        }
        const abs = nodePath.join(pkgDir, srcRel);
        out = out.replace(m[0], m[0].replace(specifier, abs));
      }
      return out === code ? null : { code: out, map: null };
    },
  };
};

/**
 * Kicks off `dx-build` (tsgo wrapper) at build start so declaration emit runs in
 * parallel with the JS bundle. Generates per-file `.d.ts` files in `dist/types/src/`.
 */
export const DxTsgoPlugin = (): Plugin => {
  let dxBuildTask: Promise<void> | undefined;

  return {
    name: 'DxTsgo',
    apply: 'build',
    buildStart() {
      dxBuildTask = runDxBuild();
    },
    async closeBundle() {
      await dxBuildTask;
    },
  };
};

// ---------------------------------------------------------------------------
// Test config surface (mirrors main's vitest.base.config.ts; extended with `jsx`).
// ---------------------------------------------------------------------------

export type ConfigOptions = {
  dirname: string;
  node?: boolean | NodeOptions;
  browser?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] });
  storybook?: boolean | StorybookOptions;
  workerd?: boolean | WorkerdOptions;
};

export type WorkerdOptions = {
  /** Workers runtime compatibility date. Defaults to a fixed recent date. */
  compatibilityDate?: string;
  /** Workers runtime compatibility flags. Defaults to `['nodejs_compat']`. */
  compatibilityFlags?: string[];
  setupFiles?: string[];
  timeout?: number;
  plugins?: Plugin[];
};

export type StorybookOptions = {
  /**
   * Disable per-file module isolation so the (heavy, WASM-backed) module graph — Automerge/SQLite
   * via `@dxos/echo` — is instantiated once and shared across story files rather than re-instantiated
   * per file. Set for packages with many ECHO-importing stories to avoid the cumulative
   * "WebAssembly instance ran out of memory during import" exhaustion in the single headless-chromium context.
   */
  isolate?: boolean;
};

export type NodeOptions = {
  environment?: 'node' | 'jsdom' | 'happy-dom';
  retry?: number;
  timeout?: number;
  setupFiles?: string[];
  plugins?: Plugin[];
  /** Which JSX runtime to wire into the vitest node project. Defaults to `'react'`. */
  jsx?: 'react' | 'solid';
};

export type BrowserOptions = {
  browserName: string;
  nodeExternal?: boolean;
  injectGlobals?: boolean;
  plugins?: Plugin[];
  /** JSX runtime for browser tests. */
  jsx?: 'react' | 'solid';
};

export const createConfig = (options: ConfigOptions): ViteUserConfig => {
  const { dirname, node, browser, storybook, workerd } = options;

  const nodeProject = node ? createNodeProject(typeof node === 'boolean' ? undefined : node) : undefined;
  const storybookProject = storybook
    ? createStorybookProject(dirname, typeof storybook === 'boolean' ? undefined : storybook)
    : undefined;
  const browserProjects = normalizeBrowserOptions(browser).map((browser) => createBrowserProject(browser));
  const workerdProject = workerd ? createWorkerdProject(typeof workerd === 'boolean' ? undefined : workerd) : undefined;

  return {
    test: {
      ...resolveReporterConfig(dirname),
      tags: TEST_TAGS,
      projects: [nodeProject, storybookProject, ...browserProjects, workerdProject].filter(
        (project): project is UserWorkspaceConfig => project !== undefined,
      ),
    },
  };
};

// Vitest sets `VITEST=true` for both `vitest run` and `vitest watch`, and its `VITEST_MODE` signal
// is only exposed to pool workers (never the main process where these configs evaluate). Watch mode
// needs the file watcher, so detect single-pass `run` mode from the CLI invocation instead: this is
// true in the vitest process that serves the story builder in-process, and false in a watch-mode
// `storybook dev` child (whose argv is storybook's, not vitest's), so both keep their watcher then.
const IS_VITEST_RUN = process.env.VITEST === 'true' && (process.argv.includes('run') || process.argv.includes('--run'));

const createStorybookProject = (dirname: string, options?: StorybookOptions) =>
  defineProject({
    test: {
      name: 'storybook',
      // The playwright/chromium session occasionally dies mid-run with
      // "Browser connection was closed while running tests", causing every
      // subsequent story file to fail to import. Retry once so a transient
      // browser-side flake doesn't fail the whole job.
      retry: 1,
      // Defaults to per-file isolation; opt out (see `StorybookOptions.isolate`) to share the WASM-backed
      // module graph across story files and avoid cumulative WebAssembly memory exhaustion.
      ...(options?.isolate !== undefined ? { isolate: options.isolate } : {}),
      browser: {
        enabled: true,
        headless: true,
        // Pin the browser timezone so `Intl.DateTimeFormat().resolvedOptions().timeZone`
        // does not resolve to `Etc/Unknown` in headless CI containers — react-aria's
        // calendar feeds that value back into `Intl.DateTimeFormat`, which throws.
        provider: playwright({ contextOptions: { timezoneId: 'America/Los_Angeles' } }),
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: [new URL('./tools/storybook-react/.storybook/vitest.setup.ts', import.meta.url).pathname],
    },
    // A storybook `vitest run` spins up two vite servers (this browser-test server and the in-process
    // story builder, see `.storybook/main.ts`); neither needs a file watcher for a single pass, and
    // vite leaks the watcher's FSEVENTWRAP + file handles on close, hanging teardown until vitest
    // force-exits non-zero. Disable this server's watcher in run mode only (watch mode needs it); the
    // builder's is disabled the same way in `main.ts`.
    ...(IS_VITEST_RUN ? { server: { watch: null } } : {}),
    resolve: {
      alias: { ...TIKTOKEN_ALIAS },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    plugins: [
      // Redirect `node:*` for source-condition-resolved @dxos/* packages (which use
      // `node:events` etc. directly). Without this vite externalises them and browser
      // tests fail with "Module has been externalized for browser compatibility".
      nodeStdResolvePlugin(),
      storybookTest({
        configDir: path.join(dirname, '.storybook'),
        // The --ci flag will skip prompts and not open a browser.
        storybookScript: 'storybook dev --ci',
        tags: {
          include: ['test'],
          exclude: ['experimental'],
        },
      }),
    ],
  });

const createBrowserProject = ({
  browserName,
  nodeExternal = false,
  injectGlobals = true,
  plugins = [],
  jsx,
}: BrowserOptions) =>
  defineProject({
    plugins: [
      nodeStdResolvePlugin(),
      WasmPlugin(),
      // Solid packages running browser tests need vite-plugin-solid here so
      // `*.test.tsx` gets the Solid client transform before the browser harness
      // loads it.
      ...(jsx === 'solid' ? [solid({ include: `${process.cwd()}/src/**/*.{tsx,jsx}` })] : []),
      ...plugins,
      // Resolve `@dxos/*` to their `source` export (src/*.ts) so browser tests exercise source
      // instead of stale `dist/` build artifacts (mirrors the node project).
      PluginImportSource({ include: ['@dxos/**', '#*'] }),
      // NDJSON log sink: browser realms (page + workers) POST `@dxos/log` entries to the dev-server
      // middleware, which appends them to `<package>/test-browser.log`. Mirrors the node file sink.
      DxosLogPlugin({ logToFile: { enabled: true, filename: BROWSER_LOG_FILE, logFilter: BROWSER_LOG_FILTER } }),
      // Inspect()
    ],
    resolve: {
      alias: { ...TIKTOKEN_ALIAS },
    },
    optimizeDeps: {
      // Deps discovered mid-run trigger a re-optimize + page reload, which destroys the
      // vitest runner state (isolate: false) and fails every remaining test file with
      // "Cannot read properties of undefined (reading 'config')". Pre-bundle the deps
      // that tests pull in lazily (worker bundles / dynamic imports / late test files).
      // Workspace packages are linked, so their deps need the nested `parent > dep` syntax.
      include: [
        'buffer/',
        'chalk',
        'effect/Schema',
        '@dxos/log > @dxos/util > @hazae41/symbol-dispose-polyfill',
        '@dxos/log > @dxos/keys > ulidx',
        '@dxos/log > lodash.defaultsdeep',
      ],
      esbuildOptions: {
        plugins: [
          // TODO(burdon): esbuild version mismatch.
          FixGracefulFsPlugin(),
          // TODO(wittjosiah): Compute nodeStd from package.json
          ...(nodeExternal ? [NodeExternalPlugin({ injectGlobals, nodeStd: true })] : []),
        ],
      },
      // `@anthropic-ai/tokenizer` re-exports `tiktoken/lite` via `require`, but
      // tiktoken's wasm has top-level await which esbuild can't put behind a
      // require(). Skip prebundling for the wasm dep so vite serves it as ESM.
      exclude: ['@dxos/wa-sqlite', 'tiktoken', 'tiktoken/lite'],
    },
    esbuild: {
      target: 'esnext',
    },
    test: {
      name: `browser-${browserName}`,
      env: {
        LOG_CONFIG: 'log-config.yaml',
      },

      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/__snapshots__/**',
        '!**/src/**/*.node.test.{ts,tsx}',
        '!**/test/**/*.node.test.{ts,tsx}',
        '!**/src/**/*.workerd.test.{ts,tsx}',
        '!**/test/**/*.workerd.test.{ts,tsx}',
      ],

      testTimeout: isDebug ? DEBUG_TIMEOUT_MS : 5000,
      isolate: false,
      maxWorkers: 1,

      browser: {
        enabled: true,
        screenshotFailures: false,
        headless: !isDebug,
        provider: playwright(),
        instances: [{ browser: browserName }],
        isolate: false,
      },

      setupFiles: [VITEST_BROWSER_LOG_SETUP],
    },
  });

// Runs tests inside the Cloudflare Workers runtime (`workerd`) via
// `@cloudflare/vitest-pool-workers`. Opt-in (like `browser`/`storybook`) — only
// `*.workerd.test.{ts,tsx}` files run here, so packages can exercise the same source
// against the runtime their production Cloudflare functions use. The node/browser
// projects exclude these files so a suite runs in exactly one runtime.
const createWorkerdProject = ({
  compatibilityDate = WORKERD_COMPATIBILITY_DATE,
  compatibilityFlags = WORKERD_COMPATIBILITY_FLAGS,
  setupFiles = [],
  timeout,
  plugins = [],
}: WorkerdOptions = {}) =>
  defineProject({
    plugins: [
      ...plugins,
      // Resolve `@dxos/*` to their `source` export (src/*.ts) so tests exercise source
      // instead of stale `dist/` build artifacts (mirrors the node/browser projects).
      PluginImportSource({ include: ['@dxos/**', '#*'] }),
      // Log-meta injection only — no file sink (workerd has no filesystem).
      DxosLogPlugin({ logToFile: false, transform: { enabled: true } }),
      // Configures the vitest pool to execute tests in workerd. `@cloudflare/vitest-pool-workers`
      // is ESM-only; a static import would make vite's (CJS) config bundler `require()` it and
      // fail for every `vite build`. A dynamic import stays an `import()` the bundler preserves,
      // and vite awaits promise-valued entries in the plugins array.
      import('@cloudflare/vitest-pool-workers').then(({ cloudflareTest }) =>
        cloudflareTest({ miniflare: { compatibilityDate, compatibilityFlags } }),
      ),
    ],
    test: {
      name: 'workerd',
      testTimeout: timeout ?? (isDebug ? DEBUG_TIMEOUT_MS : 5000),
      include: ['**/src/**/*.workerd.test.{ts,tsx}', '**/test/**/*.workerd.test.{ts,tsx}'],
      setupFiles,
    },
  });

const createNodeProject = ({
  environment = 'node',
  retry,
  timeout,
  setupFiles = [],
  plugins = [],
  jsx = 'react',
}: NodeOptions = {}) =>
  defineProject({
    esbuild: {
      target: 'esnext',
    },
    server: {
      fs: {
        allow: [new URL('./vitest', import.meta.url).pathname],
      },
    },
    test: {
      name: 'node',
      environment,
      retry,
      // Default node test timeout. The 5s vitest default is too tight for harness-based tests
      // (e.g. `createComposerTestApp` plugin-activation tests) whose cold-start exceeds 5s under CI
      // load, causing flaky timeouts in a different plugin each run. Per-package `timeout` overrides.
      testTimeout: timeout ?? (isDebug ? DEBUG_TIMEOUT_MS : 15_000),
      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/__snapshots__/**',
        '!**/src/**/*.browser.test.{ts,tsx}',
        '!**/test/**/*.browser.test.{ts,tsx}',
        '!**/src/**/*.workerd.test.{ts,tsx}',
        '!**/test/**/*.workerd.test.{ts,tsx}',
      ],
      globalSetup: [VITEST_LOG_GLOBAL_SETUP],
      setupFiles: [...setupFiles, new URL('./tools/vitest/setup.ts', import.meta.url).pathname, VITEST_LOG_SETUP],
    },
    // Shows build trace
    // VITE_INSPECT=1 pnpm vitest --ui
    // http://localhost:51204/__inspect/#/
    plugins: [
      ...plugins,
      PluginImportSource({ include: ['@dxos/**', '#*'] }),
      process.env.VITE_INSPECT ? Inspect() : undefined,
      // Log-meta injection only — no dev file sink (vitest is a test runner, not a dev server).
      DxosLogPlugin({ logToFile: false }),
      jsx === 'solid' ? solid({ include: `${process.cwd()}/src/**/*.{tsx,jsx}` }) : react(),
    ],
  });

/** Detect which project filter is active from CLI args to split coverage/results by project type. */
const resolveProjectType = (): string | undefined => {
  const projectArg = process.argv.reduce<string | undefined>((found, arg, idx, argv) => {
    if (found) {
      return found;
    }
    if (arg.startsWith('--project=')) {
      return arg.slice('--project='.length);
    }
    if (arg === '--project') {
      return argv[idx + 1];
    }
    return undefined;
  }, undefined);

  if (projectArg?.startsWith('browser')) {
    return 'browser';
  } else if (projectArg === 'node') {
    return 'node';
  } else if (projectArg === 'storybook') {
    return 'storybook';
  } else if (projectArg === 'workerd') {
    return 'workerd';
  }
  return undefined;
};

const shellQuote = (value: string): string => `"${value.replaceAll('"', '\\"')}"`;

const moonTaskForProjectType = (projectType: string | undefined): string => {
  switch (projectType) {
    case 'browser':
      return 'test-browser';
    case 'storybook':
      return 'test-storybook';
    case 'workerd':
      return 'test-workerd';
    default:
      return 'test';
  }
};

/** Prints `moon run …` commands to rerun each failed test individually. */
const createMoonRerunReporter = (options: { moonProject: string; projectType?: string }): Reporter => ({
  onTestRunEnd(testModules: ReadonlyArray<TestModule>, _errors, reason: TestRunEndReason) {
    if (reason === 'interrupted') {
      return;
    }

    const commands = new Set<string>();
    const moonTask = moonTaskForProjectType(options.projectType);

    for (const testModule of testModules) {
      for (const testCase of testModule.children.allTests('failed')) {
        const vitestProject = testCase.project.name;
        const projectFlag =
          options.projectType === 'browser' && vitestProject !== 'node' ? ` --project=${vitestProject}` : '';
        commands.add(
          `moon run ${options.moonProject}:${moonTask} -- ${testModule.relativeModuleId}${projectFlag} -t ${shellQuote(testCase.name)}`,
        );
      }
    }

    if (commands.size === 0) {
      return;
    }

    console.log('\n\x1b[33mRerun failed tests:\x1b[0m');
    for (const command of commands) {
      console.log(`  ${command}`);
    }
    console.log('');
  },
});

const resolveReporterConfig = (cwd: string): ViteUserConfig['test'] => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirName = packageDir.split('/').pop();
  if (!packageDirName) {
    throw new Error('packageDirName not found');
  }

  const projectType = resolveProjectType();
  const moonRerunReporter = createMoonRerunReporter({ moonProject: packageDirName, projectType });
  const resultsDirectory = join(__dirname, 'test-results', packageDirName, ...(projectType ? [projectType] : []));
  const reportsDirectory = join(__dirname, 'coverage', packageDirName, ...(projectType ? [projectType] : []));
  // The v8 coverage provider imports `node:inspector/promises`, which the workerd runtime does not
  // provide — coverage is unsupported for the workers pool, so never enable it for the workerd project.
  const coverageEnabled = Boolean(process.env.VITEST_COVERAGE) && projectType !== 'workerd';

  if (xmlReport) {
    return {
      passWithNoTests: true,
      reporters: [['junit', { addFileAttribute: true }], 'verbose', moonRerunReporter],
      outputFile: join(resultsDirectory, 'results.xml'),
      coverage: {
        enabled: coverageEnabled,
        reportsDirectory,
      },
    };
  }

  return {
    passWithNoTests: true,
    reporters: ['json', 'default', moonRerunReporter],
    outputFile: join(resultsDirectory, 'results.json'),
    coverage: {
      enabled: coverageEnabled,
      reportsDirectory,
    },
  };
};

const normalizeBrowserOptions = (
  options?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] }),
): BrowserOptions[] => {
  if (!options) {
    return [];
  }

  if (typeof options === 'string') {
    return [{ browserName: options }];
  }

  if (Array.isArray(options)) {
    return options.map((browser) => ({ browserName: browser }));
  }

  return options.browsers.map((browser) => ({ browserName: browser, ...options }));
};

/**
 * Replaces node built-in modules with their browser equivalents.
 * Only redirects modules that are actually implemented in @dxos/node-std.
 */
function nodeStdResolvePlugin(): Plugin {
  return {
    name: 'node-std',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        if (source.startsWith('node:')) {
          const moduleName = source.slice('node:'.length);
          if (NODE_STD_MODULES.includes(moduleName)) {
            return this.resolve('@dxos/node-std/' + moduleName, importer, options);
          }
        }

        if (NODE_STD_MODULES.includes(source)) {
          return this.resolve('@dxos/node-std/' + source, importer, options);
        }
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Unified DXOS library config (build + test).
// ---------------------------------------------------------------------------

export type TestOptions = {
  node?: boolean | NodeOptions;
  browser?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] });
  storybook?: boolean | StorybookOptions;
  workerd?: boolean | WorkerdOptions;
};

export interface DxConfigOptions {
  /** Entry point(s). Default: 'src/index.ts'. */
  entry?: string | Record<string, string>;
  /** JS output dir. Default: 'dist/lib'. */
  outDir?: string;
  /** Skip DxNodeStdPlugin (for node-only packages that don't target browser). Default: false. */
  nodeTarget?: boolean;
  /** JSX runtime for `.tsx`/`.jsx` source files. */
  jsx?: 'react' | 'solid';
  /**
   * React JSX transform. Defaults to `'automatic'` (emits `react/jsx-runtime` imports). Use
   * `'classic'` (`React.createElement`) for code that runs against a React the bundler externalizes
   * to a global — notably Storybook manager addons, whose manager bundle runs on Storybook's own
   * React 18 while automatic-runtime code would inline this repo's React 19 jsx-runtime and crash
   * (`recentlyCreatedOwnerStacks`). Only meaningful when `jsx === 'react'`.
   */
  jsxRuntime?: 'automatic' | 'classic';
  /**
   * Emit raw-asset imports (`?url` / `?raw` / `?inline`) as separate files instead of
   * base64-inlining them into the JS bundle. Matches esbuild's `file` loader. Required
   * for packages that import large binary assets (e.g. plugin-zen's `.m4a` soundscapes).
   */
  assetsAsFiles?: boolean;
  /** Vitest configuration; omit for build-only packages. */
  test?: TestOptions;
}

const buildTestConfig = (
  dirname: string,
  options: TestOptions,
  outerJsx?: 'react' | 'solid',
): ViteUserConfig['test'] => {
  const { node, browser, storybook, workerd } = options;
  // Outer `defineConfig({ jsx })` propagates into the node test project so a Solid
  // package's tests get the Solid client transform without each per-package
  // vite.config.ts having to wire `test.node.jsx` itself.
  const nodeOptions =
    typeof node === 'boolean' ? (outerJsx ? { jsx: outerJsx } : undefined) : { jsx: outerJsx, ...node };
  const nodeProject = node ? createNodeProject(nodeOptions) : undefined;
  const storybookProject = storybook
    ? createStorybookProject(dirname, typeof storybook === 'boolean' ? undefined : storybook)
    : undefined;
  const browserProjects = normalizeBrowserOptions(browser).map((b) => createBrowserProject({ jsx: outerJsx, ...b }));
  const workerdProject = workerd ? createWorkerdProject(typeof workerd === 'boolean' ? undefined : workerd) : undefined;

  return {
    ...resolveReporterConfig(dirname),
    tags: TEST_TAGS,
    // Suppress flaky vitest worker teardown unhandled rejections (e.g.
    // `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending` from
    // node tests, WebSocket birpc errors from the storybook runner) — these surface as
    // non-zero exits with no actual test failures and turn the entire job red.
    dangerouslyIgnoreUnhandledErrors: true,
    projects: [nodeProject, storybookProject, ...browserProjects, workerdProject].filter(
      (project): project is UserWorkspaceConfig => project !== undefined,
    ),
  };
};

/**
 * Single entry point for a DXOS library package's `vite.config.ts`.
 *
 * - Library JS → `dist/lib/<entry>.mjs` (rolldown, all non-relative imports external).
 * - Types → `dist/types/src/**\/*.d.ts` (tsgo, started in `buildStart`).
 * - Tests → vitest projects (`node` / `browser` / `storybook`) wired in when `test` is set.
 */
export const defineConfig = (options: DxConfigOptions = {}): UserConfig => {
  const {
    entry = 'src/index.ts',
    outDir = 'dist/lib',
    nodeTarget = false,
    jsx,
    jsxRuntime,
    assetsAsFiles = false,
    test,
  } = options;
  // Solid: ssr-aware client transform.
  const jsxPlugin: Plugin[] =
    jsx === 'react'
      ? [react(jsxRuntime ? { jsxRuntime } : undefined)]
      : jsx === 'solid'
        ? [solid({ include: `${process.cwd()}/src/**/*.{tsx,jsx}` })]
        : [];
  return viteDefineConfig({
    // Worker output config. Library packages that use `new Worker(new URL('#x',
    // import.meta.url))` rely on vite's worker bundler to lift the referenced source
    // into a separate worker chunk. The default worker config doesn't run our
    // DxNodeStdPlugin / DxRawAssetsPlugin / vite-plugin-wasm, so workers that pull
    // in @dxos/* or WASM deps (notably @dxos/client's automerge-backed coordinator)
    // fall over with `[UNLOADABLE_DEPENDENCY]`. Re-use the same plugin set.
    worker: {
      format: 'es',
      plugins: () => [
        DxWorkerResolvePlugin(),
        ...(!nodeTarget ? [DxNodeStdPlugin()] : []),
        ...(assetsAsFiles ? [DxRawAssetsPlugin()] : []),
        WasmPlugin(),
        DxosLogPlugin({ logToFile: false, transform: { enabled: true } }),
      ],
    },
    build: {
      lib: {
        entry,
        formats: ['es'],
        fileName: (_, name) => `${name}.mjs`,
      },
      outDir,
      sourcemap: true,
      minify: false,
      // When the package imports `?url` / `?raw` / `?inline` assets, force every asset
      // to be emitted as a separate file rather than base64-inlined into the bundle
      // (vite's default in library mode is to inline below ~4 KB, but rolldown's chunker
      // also lifts larger assets into a shared JS chunk — plugin-zen's 50 MB of .m4a
      // ended up in a single 64 MB chunk before this).
      ...(assetsAsFiles ? { assetsInlineLimit: 0 } : {}),
      rollupOptions: {
        // All non-relative, non-absolute imports are external — this covers @dxos/*,
        // effect, react, solid-js, and everything else automatically. Two carve-outs:
        //
        // - `node:*` flows through DxNodeStdPlugin's resolveId so it can remap to
        //   `@dxos/node-std/*`. Treating it as external here would skip plugins and
        //   leave bare `node:fs` in the output, breaking downstream esbuild consumers.
        // - `@oxc-project/runtime/*` provides decorator/JSX/regenerator helpers that
        //   rolldown injects when lowering `@decorator` / `async` / `for-await`. The
        //   helpers aren't declared deps so we bundle them inline.
        external: (id) => {
          if (id.startsWith('node:')) {
            return false;
          }
          return (
            !id.startsWith('@oxc-project/runtime') && !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0')
          );
        },
        output: {
          chunkFileNames: 'chunk-[name].mjs',
          // Keep emitted assets adjacent to the entry chunks so consumers' bundlers
          // can resolve them via the same relative path the JS already references.
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    plugins: [
      DxWorkerResolvePlugin(),
      ...(!nodeTarget ? [DxNodeStdPlugin()] : []),
      ...(assetsAsFiles ? [DxRawAssetsPlugin()] : []),
      ...jsxPlugin,
      DxosLogPlugin({ logToFile: false, transform: { enabled: true } }),
      DxTsgoPlugin(),
    ],
    ...(test ? { test: buildTestConfig(process.cwd(), test, jsx) } : {}),
  });
};
