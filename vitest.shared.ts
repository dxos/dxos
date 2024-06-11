//
// Copyright 2024 DXOS.org
//

import { join } from 'path';
import { defineConfig, type UserConfig } from 'vitest/config';
import { type Plugin } from 'vite';
// import Inspect from 'vite-plugin-inspect';
import inject from '@rollup/plugin-inject';
import { GLOBALS, MODULES } from '@dxos/node-std/_/config';

import { FixGracefulFsPlugin } from '@dxos/esbuild-plugins';

const targetProject = String(process.env.NX_TASK_TARGET_PROJECT);
const isDebug = !!process.env.VITEST_DEBUG;
const environment = (process.env.VITEST_ENV ?? '').toLowerCase();
const shouldCreateXmlReport = Boolean(process.env.VITEST_XML_REPORT);

const createNodeConfig = () =>
  defineConfig({
    esbuild: {
      target: 'es2020',
    },
    test: {
      ...resolveReporterConfig({ browserMode: false }),
      environment: 'node',
      include: ['**/src/**/*.test.ts', '!**/src/**/*.browser.test.ts'],
    },
  });

const createBrowserConfig = (browserName: 'chrome') =>
  defineConfig({
    plugins: [
      nodeStdPlugin(),
      // Inspect()
    ],
    optimizeDeps: {
      include: ['buffer/'],
      esbuildOptions: {
        plugins: [FixGracefulFsPlugin()],
      },
    },
    esbuild: {
      target: 'es2020',
      // TODO(dmaretskyi): Move into nodeStd plugin.
      banner: 'import "@dxos/node-std/globals";',
    },
    test: {
      ...resolveReporterConfig({ browserMode: true }),
      name: targetProject,
      include: ['**/src/**/*.test.ts', '!**/src/**/*.node.test.ts'],

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
        headless: !isDebug,
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

const resolveConfig = () => {
  switch (environment) {
    case 'chrome':
      return createBrowserConfig(environment);
    case 'node':
    default:
      if (environment.length > 0 && environment !== 'node') {
        console.log("Unrecognized VITEST_ENV value, falling back to 'node': " + environment);
      }
      return createNodeConfig();
  }
};

export default resolveConfig();

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
