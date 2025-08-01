//
// Copyright 2024 DXOS.org
//

import { join } from 'node:path';
import pkgUp from 'pkg-up';
import { BuildOptions, type Plugin } from 'esbuild';
import { defineConfig, UserConfig, type ViteUserConfig } from 'vitest/config';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

// import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';

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
    plugins: [process.env.VITE_INSPECT ? Inspect() : undefined],
  });

const createBrowserConfig = ({ browserName, cwd, nodeExternal = false, injectGlobals = true }: BrowserOptions) => {
  return defineConfig({
    plugins: [WasmPlugin()],
    optimizeDeps: {
      include: ['buffer/'],
      esbuildOptions: {
        plugins: [
          // FixGracefulFsPlugin(),
          // ...(nodeExternal ? [NodeExternalPlugin({ injectGlobals, nodeStd: true })] : []),
        ],
      },
    },
    esbuild: {
      target: 'es2020',
    },
    test: {
      browser: {
        enabled: true,
        headless: !isDebug,
        isolate: false,
        name: browserName,
        provider: 'playwright',
        screenshotFailures: false,
      },

      env: {
        LOG_CONFIG: 'log-config.yaml',
      },

      // include: [
      //   '**/src/**/*.test.{ts,tsx}',
      //   '**/test/**/*.test.{ts,tsx}',
      //   '!**/src/**/*.node.test.{ts,tsx}',
      //   '!**/test/**/*.node.test.{ts,tsx}',
      // ],

      inspect: isDebug,
      isolate: false,
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },

      testTimeout: isDebug ? 3600_000 : 5_000,
    },
  });
};
