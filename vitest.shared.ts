//
// Copyright 2024 DXOS.org
//

import { join } from 'node:path';
import inject from '@rollup/plugin-inject';
import { type Plugin } from 'vite';
import { defineConfig, type UserConfig } from 'vitest/config';
// import Inspect from 'vite-plugin-inspect';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { GLOBALS, MODULES } from '@dxos/node-std/_/config';

const targetProject = String(process.env.NX_TASK_TARGET_PROJECT);
const isDebug = !!process.env.VITEST_DEBUG;
const environment = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const shouldCreateXmlReport = Boolean(process.env.VITEST_XML_REPORT);

const createNodeConfig = () =>
  defineConfig({
    esbuild: {
      target: 'es2020',
    },
    test: {
      ...resolveReporterConfig({ browserMode: false }),
      environment: 'node',
      include: [
        '**/src/**/*.test.{ts,tsx}',
        '**/test/**/*.test.{ts,tsx}',
        '!**/src/**/*.browser.test.{ts,tsx}',
        '!**/test/**/*.browser.test.{ts,tsx}',
      ],
    },
    // Shows build trace
    // VITE_INSPECT=1 pnpm vitest --ui
    // http://localhost:51204/__inspect/#/
    plugins: [process.env.VITE_INSPECT && Inspect()],
  });

type BrowserOptions = {
  browserName: string;
  nodeExternal?: boolean;
  injectGlobals?: boolean;
};

const createBrowserConfig = ({ browserName, nodeExternal = false, injectGlobals = true }) =>
  defineConfig({
    plugins: [
      nodeStdPlugin(),
      TopLevelAwaitPlugin(),
      WasmPlugin(),
      // Inspect()
    ],
    optimizeDeps: {
      include: ['buffer/'],
      esbuildOptions: {
        plugins: [
          FixGracefulFsPlugin(),
          // TODO(wittjosiah): Compute nodeStd from package.json.
          ...(nodeExternal ? [NodeExternalPlugin({ injectGlobals, nodeStd: true })] : []),
        ],
      },
    },
    esbuild: {
      target: 'es2020',
    },
    test: {
      ...resolveReporterConfig({ browserMode: true }),
      name: targetProject,
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

const resolveReporterConfig = (args: { browserMode: boolean }): UserConfig['test'] => {
  if (shouldCreateXmlReport) {
    const vitestReportDir = `vitest${args.browserMode ? '-browser' : ''}-reports`;
    return {
      passWithNoTests: true,
      reporters: ['junit', 'verbose'],
      outputFile: join(__dirname, `test-results/${vitestReportDir}/${targetProject}/report.xml`),
    };
  }

  return {
    passWithNoTests: true,
    reporters: ['verbose'],
  };
};

export type ConfigOptions = Omit<BrowserOptions, 'browserName'>;

export const baseConfig = (options: ConfigOptions = {}): UserConfig => {
  switch (environment) {
    case 'chromium':
      return createBrowserConfig({ browserName: environment, ...options });
    case 'node':
    default:
      if (environment.length > 0 && environment !== 'node') {
        console.log("Unrecognized VITEST_ENV value, falling back to 'node': " + environment);
      }
      return createNodeConfig();
  }
};

/**
 * @deprecated use `baseConfig` instead.
 */
export default baseConfig();

// TODO(dmaretskyi): Extract.
/**
 * Replaces node built-in modules with their browser equivalents.
 */
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
