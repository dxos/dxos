//
// Copyright 2024 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path, { join } from 'node:path';
import pkgUp from 'pkg-up';
import { type Plugin } from 'vite';
import { defineConfig, defineProject, type ViteUserConfig } from 'vitest/config';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { MODULES } from '@dxos/node-std/_/config';
import PluginImportSource from '@dxos/vite-plugin-import-source';
import react from '@vitejs/plugin-react-swc';

const isDebug = !!process.env.VITEST_DEBUG;
const environment = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const xmlReport = Boolean(process.env.VITEST_XML_REPORT);

type BrowserOptions = {
  cwd: string;
  browserName: string;
  nodeExternal?: boolean;
  injectGlobals?: boolean;
};

export type ConfigOptions = Omit<BrowserOptions, 'browserName'>;

export const baseConfig = (options: ConfigOptions): ViteUserConfig => {
  switch (environment) {
    case 'chromium': {
      return createBrowserConfig({ browserName: environment, ...options });
    }
    case 'node':
    default: {
      if (environment.length > 0 && environment !== 'node') {
        console.log("Unrecognized VITEST_ENV value, falling back to 'node': " + environment);
      }

      return createNodeConfig(options.cwd);
    }
  }
};

export const createStorybookProject = (dirname: string) =>
  defineProject({
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: ['../../../tools/storybook/.storybook/vitest.setup.ts'],
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

// TODO(wittjosiah): Reconcile w/ createNodeConfig.
export const createNodeProject = ({
  environment = 'node',
  retry = 0,
  setupFiles = [],
  plugins = [],
}: {
  environment?: 'node' | 'jsdom';
  retry?: number;
  setupFiles?: string[];
  plugins?: Plugin[];
} = {}) =>
  defineProject({
    esbuild: {
      target: 'es2020',
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

      // We don't care about react but we want the SWC transforers.
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

const createNodeConfig = (cwd: string) =>
  defineConfig({
    esbuild: {
      target: 'es2020',
    },
    server: {
      fs: {
        allow: [new URL('./vitest', import.meta.url).pathname],
      },
    },
    test: {
      ...resolveReporterConfig({ browserMode: false, cwd }),
      environment: 'node',
      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/*.browser.test.{ts,tsx}',
        '!**/test/**/*.browser.test.{ts,tsx}',
      ],
      setupFiles: [new URL('./tools/vitest/setup.ts', import.meta.url).pathname],
    },
    // Shows build trace
    // VITE_INSPECT=1 pnpm vitest --ui
    // http://localhost:51204/__inspect/#/
    plugins: [
      PluginImportSource(),

      process.env.VITE_INSPECT ? Inspect() : undefined,

      // We don't care about react but we want the SWC transforers.
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

const createBrowserConfig = ({ browserName, cwd, nodeExternal = false, injectGlobals = true }: BrowserOptions) =>
  defineConfig({
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
      target: 'es2020',
    },
    test: {
      ...resolveReporterConfig({ browserMode: true, cwd }),

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
      inspect: isDebug,
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

export const resolveReporterConfig = ({
  browserMode,
  cwd,
}: {
  browserMode?: boolean;
  cwd: string;
}): ViteUserConfig['test'] => {
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
    reporters: ['json', 'verbose'],
    outputFile: join(resultsDirectory, 'results.json'),
    coverage: {
      enabled: coverageEnabled,
      reportsDirectory,
    },
  };
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
