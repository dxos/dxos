//
// Copyright 2024 DXOS.org
//

import { join } from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig, type UserConfig } from 'vitest/config';

import { FixGracefulFsPlugin } from '@dxos/esbuild-plugins';

const targetProject = String(process.env.NX_TASK_TARGET_PROJECT);
const isDebug = !!process.env.VITEST_DEBUG;
const environment = (process.env.VITEST_ENV ?? '').toLowerCase();
const shouldCreateXmlReport = process.env.VITEST_XML_REPORT;

const createNodeConfig = () =>
  defineConfig({
    test: {
      ...resolveReporterConfig(),
      environment: 'node',
      include: ['**/src/**/*.test.ts', '!**/src/**/*.browser.test.ts'],
    },
  });

const createBrowserConfig = (browserName: 'chrome') =>
  defineConfig({
    plugins: [nodePolyfills()],
    resolve: {
      alias: {
        buffer: 'buffer/',
      },
    },
    optimizeDeps: {
      include: ['buffer/'],
      esbuildOptions: {
        plugins: [FixGracefulFsPlugin()],
      },
    },
    test: {
      ...resolveReporterConfig(),
      name: targetProject,
      include: ['**/src/**/*.browser.test.ts', '!**/src/**/*.node.test.ts'],

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

const resolveReporterConfig = (): UserConfig['test'] => {
  if (shouldCreateXmlReport) {
    return {
      reporters: ['junit', 'verbose'],
      outputFile: join(__dirname, `vitest-reports/${targetProject}/report.xml`),
    };
  }
  return {
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
