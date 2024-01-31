import { defineConfig } from 'vitest/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { FixGracefulFsPlugin } from '@dxos/esbuild-plugins';

const isDebug = !!process.env.VITEST_DEBUG;

function createNodeConfig() {
  return defineConfig({
    test: {
      reporters: ['basic'],
      environment: 'node',
      include: ['*/node/**.test.ts'],
    },
  });
}

function createBrowserConfig() {
  return defineConfig({
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
      reporters: ['basic'],
      include: ['*/browser/**.test.ts'],

      isolate: false,
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      browser: {
        enabled: true,
        headless: true,
        name: 'chrome',
        isolate: true,
      },
    },
  });
}

function resolveConfig() {
  switch (process.env.VITEST_ENV?.toLowerCase()) {
    case 'browser':
      return createBrowserConfig();
    case 'node':
    default:
      return createNodeConfig();
  }
}

export default resolveConfig();