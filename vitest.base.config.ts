//
// Copyright 2024 DXOS.org
//

import { join, dirname } from 'node:path';
import pkgUp from 'pkg-up';
import { type Plugin } from 'vite';
import { defineConfig, type ViteUserConfig } from 'vitest/config';
import WasmPlugin from 'vite-plugin-wasm';
import Inspect from 'vite-plugin-inspect';

import { FixGracefulFsPlugin, NodeExternalPlugin } from '@dxos/esbuild-plugins';
import { MODULES } from '@dxos/node-std/_/config';
import Minimatch from 'minimatch';

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
    plugins: [PluginImportSource(), process.env.VITE_INSPECT ? Inspect() : undefined],
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

import { ResolverFactory } from 'oxc-resolver';

const resolver = new ResolverFactory({
  conditionNames: ['source'],
});

interface PluginImportSourceOptions {
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
}

const PluginImportSource = ({
  include = ['**'],
  exclude = ['**/node_modules/**'],
  verbose = !!process.env.IMPORT_SOURCE_DEBUG,
}: PluginImportSourceOptions = {}): Plugin => {
  const globOptions = { dot: true };

  return {
    name: 'plugin-import-source',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // Check if source looks like an npm package name
        if (!source.match(/^[a-zA-Z@][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next importer
        }

        try {
          if (!importer) {
            return null;
          }
          const resolved = await resolver.async(importer, source);
          verbose &&
            console.log({
              source,
              importer,
              resolved,
            });
          if (resolved.error || !resolved.path) {
            return null;
          }
          const match =
            include.some((pattern) => Minimatch(resolved.path, pattern, globOptions)) &&
            !exclude.some((pattern) => Minimatch(resolved.path, pattern, globOptions));
          verbose &&
            console.log({
              match,
              path: resolved.path,
              include: include.map((pattern) => [pattern, Minimatch(resolved.path, pattern, globOptions)]),
              exclude: exclude.map((pattern) => [pattern, Minimatch(resolved.path, pattern, globOptions)]),
            });
          if (!match) {
            return null;
          }

          verbose && console.log(`${source} -> ${resolved.path}`);
          return resolved.path;
        } catch (error) {
          verbose && console.error(error);
          // If resolution fails, return null to skip to next resolver
          return null;
        }
      },
    },
  };
};
