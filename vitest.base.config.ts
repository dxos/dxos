//
// Copyright 2024 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react-swc';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkgUp from 'pkg-up';
import { type Plugin } from 'vite';
import { defineConfig, defineProject, UserWorkspaceConfig, type ViteUserConfig } from 'vitest/config';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { MODULES } from '@dxos/node-std/_/config';
import PluginImportSource from '@dxos/vite-plugin-import-source';

const isDebug = !!process.env.VITEST_DEBUG;
const xmlReport = Boolean(process.env.VITEST_XML_REPORT);

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
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: [new URL('./tools/storybook/.storybook/vitest.setup.ts', import.meta.url).pathname],
    },
    optimizeDeps: { include: ['@preact-signals/safe-react/tracking'] },
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
};

const createBrowserProject = ({ browserName, nodeExternal = false, injectGlobals = true }: BrowserOptions) =>
  defineProject({
    plugins: [
      nodeStdPlugin(),
      WasmPlugin(),
      // Inspect()
    ],
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
    },
    esbuild: {
      target: 'esnext',
    },
    test: {
      env: {
        LOG_CONFIG: 'log-config.yaml',
      },

      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/*.node.test.{ts,tsx}',
        '!**/test/**/*.node.test.{ts,tsx}',
      ],

      testTimeout: isDebug ? 3600_000 : 5000,
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
        provider: 'playwright',
        name: browserName,
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
      testTimeout: timeout,
      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
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
      PluginImportSource(),
      process.env.VITE_INSPECT ? Inspect() : undefined,
      // Add react plugin to enable SWC transfors.
      react({
        tsDecorators: true,
        plugins: [
          [
            '@dxos/swc-log-plugin',
            {
              to_transform: [
                {
                  name: 'log',
                  package: '@dxos/log',
                  param_index: 2,
                  include_args: false,
                  include_call_site: true,
                  include_scope: true,
                },
                {
                  name: 'invariant',
                  package: '@dxos/invariant',
                  param_index: 2,
                  include_args: true,
                  include_call_site: false,
                  include_scope: true,
                },
                {
                  name: 'Context',
                  package: '@dxos/context',
                  param_index: 1,
                  include_args: false,
                  include_call_site: false,
                  include_scope: false,
                },
              ],
            },
          ],
        ],
      }),
    ],
  });

const resolveReporterConfig = (cwd: string): ViteUserConfig['test'] => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirName = packageDir.split('/').pop();
  if (!packageDirName) {
    throw new Error('packageDirName not found');
  }

  const resultsDirectory = join(__dirname, 'test-results', packageDirName);
  const reportsDirectory = join(__dirname, 'coverage', packageDirName);
  const coverageEnabled = Boolean(process.env.VITEST_COVERAGE);

  if (xmlReport) {
    return {
      passWithNoTests: true,
      reporters: ['junit', 'verbose'],
      // TODO(wittjosiah): Browser mode will overwrite this, should be separate directories
      //    however moon outputs config also needs to be aware of this.
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
 */
// TODO(dmaretskyi): Extract.
function nodeStdPlugin(): Plugin {
  return {
    name: 'node-std',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        if (source.startsWith('node:')) {
          return this.resolve('@dxos/node-std/' + source.slice('node:'.length), importer, options);
        }

        if (MODULES.includes(source)) {
          return this.resolve('@dxos/node-std/' + source, importer, options);
        }
      },
    },
  };
}
