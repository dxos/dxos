//
// Copyright 2024 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path, { join } from 'node:path';
import pkgUp from 'pkg-up';
import { type Plugin } from 'vite';
import Inspect from 'vite-plugin-inspect';
import WasmPlugin from 'vite-plugin-wasm';
import { defineProject, UserWorkspaceConfig, type ViteUserConfig } from 'vitest/config';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { MODULES } from '@dxos/node-std/_/config';
import PluginImportSource from '@dxos/vite-plugin-import-source';

// NOTE: Imported by relative path on purpose. Going through `@dxos/vite-plugin-log`
// would force every package's `:test`/`:test-browser`/`:test-storybook` task to
// build the plugin first, which introduces a moon dep cycle through @dxos/log
// (vite-plugin-log -> log -> ... -> log:test -> vite-plugin-log).
import { DxosLogPlugin } from './tools/vite-plugin-log/src/plugin.ts';
import { TEST_TAGS } from './vitest.tags';

export { TEST_TAGS };

const isDebug = !!process.env.VITEST_DEBUG;
const xmlReport = Boolean(process.env.VITEST_XML_REPORT);
const DEBUG_TIMEOUT_MS = 3_600_000;

// Browser/storybook tests transitively import `@anthropic-ai/tokenizer` via
// `@dxos/ai`, which pulls in `tiktoken/lite` — a WASM bundle whose top-level
// `await` cannot be rewrapped by esbuild's dep pre-bundler. Composer-app's
// vite.config.ts aliases it to an empty stub for the same reason. None of
// the browser tests actually tokenize, so the alias is safe.
const TIKTOKEN_STUB = new URL('./vitest/tiktoken-stub.mjs', import.meta.url).pathname;
const TIKTOKEN_ALIAS = { 'tiktoken/lite': TIKTOKEN_STUB };

// `chalk` (used by `@dxos/log` for terminal coloring) probes `tty`/`process`
// color support at import time, which crashes the `workerd` runtime with a
// native segfault under `@cloudflare/vitest-pool-workers`. Coloring is a no-op
// in the worker test runtime, so the workerd project aliases it to an identity
// stub. See `vitest/chalk-stub.mjs`.
const CHALK_STUB = new URL('./vitest/chalk-stub.mjs', import.meta.url).pathname;

export type ConfigOptions = {
  dirname: string;
  node?: boolean | NodeOptions;
  browser?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] });
  storybook?: boolean;
  workerd?: boolean | WorkerdOptions;
};

export const createConfig = (options: ConfigOptions): ViteUserConfig => {
  const { dirname, node, browser, storybook, workerd } = options;

  const nodeProject = node ? createNodeProject(typeof node === 'boolean' ? undefined : node) : undefined;
  const storybookProject = storybook ? createStorybookProject(dirname) : undefined;
  const browserProjects = normalizeBrowserOptions(browser).map((browser) => createBrowserProject(browser));
  const workerdProject = workerd ? createWorkerdProject(typeof workerd === 'boolean' ? undefined : workerd) : undefined;

  return {
    test: {
      ...resolveReporterConfig(dirname),
      tags: TEST_TAGS,
      // The workers pool needs vitest itself to run serially so its single
      // miniflare instance survives the whole run — otherwise each spawned
      // worker builds its own instance and the pool's `unsafeEvalBinding`
      // (used to compile wasm) doesn't reach the worker that loads it, so
      // workerd rejects `new WebAssembly.Module()` ("code generation disallowed
      // by embedder"). Only applied when the workerd project is present.
      ...(workerdProject ? { fileParallelism: false, maxWorkers: 1 } : {}),
      projects: [nodeProject, storybookProject, workerdProject, ...browserProjects].filter(
        (project): project is UserWorkspaceConfig => project !== undefined,
      ),
    },
  };
};

const createStorybookProject = (dirname: string) =>
  defineProject({
    test: {
      name: 'storybook',
      // The playwright/chromium session occasionally dies mid-run with
      // "Browser connection was closed while running tests", causing every
      // subsequent story file to fail to import. Retry once so a transient
      // browser-side flake doesn't fail the whole job.
      retry: 1,
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
    resolve: {
      alias: { ...TIKTOKEN_ALIAS },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    plugins: [
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

type WorkerdOptions = {
  /** Worker runtime compatibility date. @default '2024-09-23' (enables nodejs_compat v2). */
  compatibilityDate?: string;
  /** Worker runtime compatibility flags. @default ['nodejs_compat']. */
  compatibilityFlags?: string[];
  plugins?: Plugin[];
};

/**
 * Runs `*.workerd.test.{ts,tsx}` files inside the Cloudflare Workers (`workerd`)
 * runtime via `@cloudflare/vitest-pool-workers` + Miniflare. The `workerd`
 * export condition is resolved first so `@dxos/*` packages load their
 * `*.workerd.ts` variant — the same module the edge/agent runtime loads.
 */
const createWorkerdProject = ({
  compatibilityDate = '2024-09-23',
  compatibilityFlags = ['nodejs_compat'],
  plugins = [],
}: WorkerdOptions = {}) =>
  defineProject({
    resolve: {
      // List `workerd` ahead of `browser` so packages that ship a dedicated
      // `workerd` export (e.g. `@automerge/automerge-subduction`) load it rather
      // than their bundler/browser build. cloudflareTest also force-includes
      // these (and excludes `node`); declaring the order here makes it explicit.
      conditions: ['workerd', 'worker', 'module', 'browser'],
      alias: { chalk: CHALK_STUB },
    },
    esbuild: {
      target: 'esnext',
    },
    plugins: [
      // With `workerd`-first conditions, deps load their wasm-bindgen `workerd`
      // build (no `_bg.js` glue): `import wasm from "*.wasm"` + initSync. This
      // plugin resolves those imports to a concrete path so the pool's runner
      // serves them as `WebAssembly.Module` instances via the `CompiledWasm`
      // module rule below — see workerdWasmModulePlugin.
      workerdWasmModulePlugin(),
      // Prefer the `source` condition for `@dxos/*` so the `workerd` export
      // variant (added by cloudflareTest's required conditions) loads from TS
      // source rather than the prebuilt `dist`.
      PluginImportSource({ include: ['@dxos/**', '#*'] }),
      // Log-meta injection only — no dev file sink.
      DxosLogPlugin({ logToFile: false }),
      ...plugins,
      // `@cloudflare/vitest-pool-workers` is ESM-only. The shared base config is
      // also loaded by packages without `"type": "module"` (their config bundles
      // to CJS, where a static top-level import becomes a `require` and throws
      // "This package is ESM only"). Importing it dynamically — only here, in the
      // workerd project those packages never construct — keeps it out of the CJS
      // require graph; Vite awaits Promise-valued plugins. This is the workaround
      // the Vite "ESM only" error links to.
      import('@cloudflare/vitest-pool-workers').then(({ cloudflareTest }) =>
        cloudflareTest({
          miniflare: {
            compatibilityDate,
            compatibilityFlags,
            // Serve `*.wasm` imports as `WebAssembly.Module` instances so deps
            // like `@automerge/automerge`'s `workerd` build can `initSync` them.
            modulesRules: [{ type: 'CompiledWasm', include: ['**/*.wasm'] }],
          },
        }),
      ),
    ],
    test: {
      name: 'workerd',
      include: ['**/src/**/*.workerd.test.{ts,tsx}', '**/test/**/*.workerd.test.{ts,tsx}'],
      setupFiles: [new URL('./vitest/workerd-setup.mjs', import.meta.url).pathname],
      testTimeout: isDebug ? DEBUG_TIMEOUT_MS : 30_000,
    },
  });

type BrowserOptions = {
  browserName: string;
  nodeExternal?: boolean;
  injectGlobals?: boolean;
  plugins?: Plugin[];
};

const createBrowserProject = ({
  browserName,
  nodeExternal = false,
  injectGlobals = true,
  plugins = [],
}: BrowserOptions) =>
  defineProject({
    plugins: [
      nodeStdPlugin(),
      WasmPlugin(),
      ...plugins,
      // Inspect()
    ],
    resolve: {
      alias: { ...TIKTOKEN_ALIAS },
    },
    optimizeDeps: {
      include: ['buffer/'],
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
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },

      browser: {
        enabled: true,
        screenshotFailures: false,
        headless: !isDebug,
        provider: playwright(),
        instances: [{ browser: browserName }],
        isolate: false,
      },
    },
  });

type NodeOptions = {
  environment?: 'node' | 'jsdom' | 'happy-dom';
  retry?: number;
  timeout?: number;
  setupFiles?: string[];
  plugins?: Plugin[];
};

const createNodeProject = ({ environment = 'node', retry, timeout, setupFiles = [], plugins = [] }: NodeOptions = {}) =>
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
      testTimeout: timeout ?? (isDebug ? DEBUG_TIMEOUT_MS : undefined),
      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/__snapshots__/**',
        '!**/src/**/*.browser.test.{ts,tsx}',
        '!**/test/**/*.browser.test.{ts,tsx}',
        '!**/src/**/*.workerd.test.{ts,tsx}',
        '!**/test/**/*.workerd.test.{ts,tsx}',
      ],
      setupFiles: [...setupFiles, new URL('./tools/vitest/setup.ts', import.meta.url).pathname],
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
      react(),
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

const resolveReporterConfig = (cwd: string): ViteUserConfig['test'] => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirName = packageDir.split('/').pop();
  if (!packageDirName) {
    throw new Error('packageDirName not found');
  }

  const projectType = resolveProjectType();
  const resultsDirectory = join(__dirname, 'test-results', packageDirName, ...(projectType ? [projectType] : []));
  const reportsDirectory = join(__dirname, 'coverage', packageDirName, ...(projectType ? [projectType] : []));
  const coverageEnabled = Boolean(process.env.VITEST_COVERAGE);

  if (xmlReport) {
    return {
      passWithNoTests: true,
      reporters: [['junit', { addFileAttribute: true }], 'verbose'],
      outputFile: join(resultsDirectory, 'results.xml'),
      coverage: {
        enabled: coverageEnabled,
        reportsDirectory,
      },
    };
  }

  return {
    passWithNoTests: true,
    reporters: ['json', 'default'],
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
// TODO(dmaretskyi): Extract.
function nodeStdPlugin(): Plugin {
  return {
    name: 'node-std',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        if (source.startsWith('node:')) {
          const moduleName = source.slice('node:'.length);
          if (MODULES.includes(moduleName)) {
            return this.resolve('@dxos/node-std/' + moduleName, importer, options);
          }
        }

        if (MODULES.includes(source)) {
          return this.resolve('@dxos/node-std/' + source, importer, options);
        }
      },
    },
  };
}

/**
 * Resolves `*.wasm` imports to a concrete file path (stripping any query the
 * pool re-adds, e.g. `?mf_vitest_force=CompiledWasm`) so the
 * `@cloudflare/vitest-pool-workers` runner serves them as `WebAssembly.Module`
 * instances — the form wasm-bindgen's `initSync({ module })` expects — via the
 * project's `CompiledWasm` module rule. The id is returned *without*
 * `external: true`: Vite serves it as `/@fs/…` and the runner externalizes it
 * at fetch time. Marking it external instead yields a bare absolute path the
 * pool mis-joins against the project root ("no such file").
 */
function workerdWasmModulePlugin(): Plugin {
  return {
    name: 'workerd-wasm-module',
    enforce: 'pre',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        if (!source.endsWith('.wasm') && !source.includes('.wasm?')) {
          return null;
        }
        const bare = source.split('?')[0];
        const resolved = await this.resolve(bare, importer, { ...options, skipSelf: true });
        return resolved ? { id: resolved.id.split('?')[0] } : null;
      },
    },
  };
}
