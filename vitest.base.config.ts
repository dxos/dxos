//
// Copyright 2024 DXOS.org
//

import { join, relative } from 'node:path';
import pkgUp from 'pkg-up';
import { type Plugin, UserConfig as ViteConfig } from 'vite';
import { defineConfig, ViteUserConfig, type UserConfig as VitestConfig } from 'vitest/config';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { MODULES } from '@dxos/node-std/_/config';

const targetProject = String(process.env.NX_TASK_TARGET_PROJECT);

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

export const baseConfig = (options: ConfigOptions): ViteConfig => {
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
      setupFiles: [new URL('./vitest/setup.ts', import.meta.url).pathname],
    },
    // Shows build trace
    // VITE_INSPECT=1 pnpm vitest --ui
    // http://localhost:51204/__inspect/#/
    plugins: [process.env.VITE_INSPECT ? Inspect() : undefined],
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

      name: targetProject,

      env: {
        LOG_CONFIG: 'log-config.yaml',
      },

      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/*.node.test.{ts,tsx}',
        '!**/test/**/*.node.test.{ts,tsx}',
      ],

      testTimeout: isDebug ? 9999999 : 5000,
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

const resolveReporterConfig = ({ browserMode, cwd }: { browserMode: boolean; cwd: string }): ViteUserConfig['test'] => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson!.split('/').slice(0, -1).join('/');
  const packageDirRelative = relative(__dirname, packageDir);
  const reportsDirectory = join(__dirname, 'coverage', packageDirRelative);
  const coverageEnabled = Boolean(process.env.VITEST_COVERAGE);

  if (xmlReport) {
    return {
      passWithNoTests: true,
      reporters: ['junit', 'verbose'],
      // TODO(wittjosiah): Browser mode will overwrite this, should be separate directories
      //    however nx outputs config also needs to be aware of this.
      outputFile: join(__dirname, 'test-results', packageDirRelative, 'results.xml'),
      coverage: {
        enabled: coverageEnabled,
        reportsDirectory,
      },
    };
  }

  return {
    passWithNoTests: true,
    reporters: ['verbose'],
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
