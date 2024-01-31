import { defineConfig, UserConfig } from 'vitest/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { FixGracefulFsPlugin } from '@dxos/esbuild-plugins';
import {join} from "path";

const isDebug = !!process.env.VITEST_DEBUG;

function createNodeConfig() {
  return defineConfig({
    test: {
      ...resolveReporterConfig(),
      environment: 'node',
      include: ['**.test.ts'],
      exclude: ["**/node_modules/**", "**/dist/**", '**/browser/**.test.ts']
    },
  });
}

function createBrowserConfig(browserName: 'chrome') {
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
      ...resolveReporterConfig(),
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
        name: browserName,
        isolate: false,
      },
    },
  });
}

function resolveReporterConfig(): UserConfig["test"] {
  if (Boolean(process.env.VITEST_XML_REPORT)) {
    return {
      reporters: ['junit'],
      outputFile: join(__dirname, `vitest-reports/${String(process.env.NX_TASK_TARGET_PROJECT)}/report.xml`)
    };
  }
  return {
    reporters: ['basic']
  };
}

function resolveConfig() {
  const environment = (process.env.VITEST_ENV ?? "").toLowerCase();
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
}

export default resolveConfig();