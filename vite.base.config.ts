//
// Copyright 2026 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { spawnSync } from 'node:child_process';
import path, { join } from 'node:path';
import pkgUp from 'pkg-up';
// Vite 8 ships rolldown as its bundler by default (no `rolldown-vite` shim needed).
import { defineConfig as viteDefineConfig, type Plugin, type UserConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';
import solid from 'vite-plugin-solid';
import WasmPlugin from 'vite-plugin-wasm';
import { defineProject, type UserWorkspaceConfig, type ViteUserConfig } from 'vitest/config';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import PluginImportSource from '@dxos/vite-plugin-import-source';

// Relative import — going through `@dxos/vite-plugin-log` would force every package's
// `:test` / `:test-browser` / `:test-storybook` task to build the plugin first, which
// introduces a moon dep cycle through @dxos/log
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
 * Invokes `dx-build` (tsgo wrapper) after the JS bundle is written.
 * Generates per-file `.d.ts` files in `dist/types/src/` — no bundling, no TS2883.
 */
export const DxTsgoPlugin = (): Plugin => ({
  name: 'DxTsgo',
  apply: 'build',
  closeBundle() {
    const result = spawnSync('pnpm', ['exec', 'dx-build'], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(
        `dx-build (tsgo) failed: status=${result.status} signal=${result.signal} error=${result.error?.message ?? 'none'} cwd=${process.cwd()}`,
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Vitest project builders
// ---------------------------------------------------------------------------

export type NodeOptions = {
  environment?: 'node' | 'jsdom' | 'happy-dom';
  retry?: number;
  timeout?: number;
  setupFiles?: string[];
  plugins?: Plugin[];
};

export type BrowserOptions = {
  browserName: string;
  nodeExternal?: boolean;
  injectGlobals?: boolean;
  plugins?: Plugin[];
};

export type TestOptions = {
  node?: boolean | NodeOptions;
  browser?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] });
  storybook?: boolean;
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
      ],
      setupFiles: [...setupFiles, new URL('./tools/vitest/setup.ts', import.meta.url).pathname],
    },
    plugins: [
      ...plugins,
      PluginImportSource({ include: ['@dxos/**', '#*'] }),
      process.env.VITE_INSPECT ? Inspect() : undefined,
      // Log-meta injection only — no dev file sink (vitest is a test runner, not a dev server).
      DxosLogPlugin({ logToFile: false }),
      react(),
    ],
  });

const createBrowserProject = ({
  browserName,
  nodeExternal = false,
  injectGlobals = true,
  plugins = [],
}: BrowserOptions) =>
  defineProject({
    plugins: [nodeStdResolvePlugin(), WasmPlugin(), ...plugins],
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

const createStorybookProject = (dirname: string) =>
  defineProject({
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: [new URL('./tools/storybook-react/.storybook/vitest.setup.ts', import.meta.url).pathname],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    plugins: [
      // Source-mapped imports of @dxos/* point at the package's TS sources, so the
      // browser test environment sees `import 'node:events'` (and similar) directly.
      // Without this resolver vite externalises them and you get
      // `Module "node:events" has been externalized for browser compatibility`.
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

/** Replaces node built-in modules with their browser equivalents (for vitest browser projects). */
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

const buildTestConfig = (dirname: string, options: TestOptions): ViteUserConfig['test'] => {
  const { node, browser, storybook } = options;
  const nodeProject = node ? createNodeProject(typeof node === 'boolean' ? undefined : node) : undefined;
  const storybookProject = storybook ? createStorybookProject(dirname) : undefined;
  const browserProjects = normalizeBrowserOptions(browser).map((b) => createBrowserProject(b));

  return {
    ...resolveReporterConfig(dirname),
    tags: TEST_TAGS,
    // Suppress flaky vitest worker teardown unhandled rejections (e.g.
    // `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending` from
    // node tests, WebSocket birpc errors from the storybook runner) — these surface as
    // non-zero exits with no actual test failures and turn the entire job red.
    dangerouslyIgnoreUnhandledErrors: true,
    projects: [nodeProject, storybookProject, ...browserProjects].filter(
      (project): project is UserWorkspaceConfig => project !== undefined,
    ),
  };
};

// ---------------------------------------------------------------------------
// Unified DXOS library config
// ---------------------------------------------------------------------------

export interface DxConfigOptions {
  /** Entry point(s). Default: 'src/index.ts'. */
  entry?: string | Record<string, string>;
  /** JS output dir. Default: 'dist/lib'. */
  outDir?: string;
  /** Skip DxNodeStdPlugin (for node-only packages that don't target browser). Default: false. */
  nodeTarget?: boolean;
  /** JSX runtime for `.tsx`/`.jsx` source files. */
  jsx?: 'react' | 'solid';
  /** Vitest configuration; omit for build-only packages. `dirname` is auto-derived from `process.cwd()`. */
  test?: TestOptions;
}

/**
 * Single entry point for a DXOS library package's `vite.config.ts`.
 *
 * - Library JS → `dist/lib/<entry>.mjs` (rolldown, all non-relative imports external).
 * - Types → `dist/types/src/**\/*.d.ts` (tsgo, run in `closeBundle`).
 * - Tests → vitest projects (`node` / `browser` / `storybook`) wired in when `test` is set.
 */
export const defineConfig = (options: DxConfigOptions = {}): UserConfig => {
  const { entry = 'src/index.ts', outDir = 'dist/lib', nodeTarget = false, jsx, test } = options;
  // Solid: ssr-aware client transform.
  const jsxPlugin: Plugin[] = jsx === 'react' ? [react()] : jsx === 'solid' ? [solid()] : [];
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
        },
      },
    },
    plugins: [
      ...(!nodeTarget ? [DxNodeStdPlugin()] : []),
      ...jsxPlugin,
      DxosLogPlugin({ logToFile: false, transform: { enabled: true } }),
      DxTsgoPlugin(),
    ],
    ...(test ? { test: buildTestConfig(process.cwd(), test) } : {}),
  });
};

// ---------------------------------------------------------------------------
// Backward-compat exports for legacy `vitest.config.ts` consumers.
// New code should call `defineConfig({ test })` from this file instead.
// ---------------------------------------------------------------------------

export type ConfigOptions = TestOptions & { dirname: string };

export const createConfig = (options: ConfigOptions): ViteUserConfig => {
  const { dirname, ...rest } = options;
  return { test: buildTestConfig(dirname, rest) };
};

export const createTestConfig = (options: ConfigOptions): ViteUserConfig['test'] => createConfig(options).test;
