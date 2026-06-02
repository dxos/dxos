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

export type ConfigOptions = {
  dirname: string;
  node?: boolean | NodeOptions;
  browser?: string | string[] | (Omit<BrowserOptions, 'browserName'> & { browsers: string[] });
  storybook?: boolean;
};

export const createConfig = (options: ConfigOptions): ViteUserConfig => {
  const { dirname, node, browser, storybook } = options;

  const nodeProject = node ? createNodeProject(typeof node === 'boolean' ? undefined : node) : undefined;
  const storybookProject = storybook ? createStorybookProject(dirname) : undefined;
  const browserProjects = normalizeBrowserOptions(browser).map((browser) => createBrowserProject(browser));

  return {
    test: {
      ...resolveReporterConfig(dirname),
      tags: TEST_TAGS,
      projects: [nodeProject, storybookProject, ...browserProjects].filter(
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
