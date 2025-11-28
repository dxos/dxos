//
// Copyright 2023 DXOS.org
//

import { type Plugin, type PluginBuild, build, initialize } from 'esbuild-wasm';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { isNode, trim } from '@dxos/util';

import { BundleCreationError } from '../errors';
import { httpPlugin } from '../http-plugin-esbuild';

export type Import = {
  moduleUrl: string;
  defaultImport: boolean;
  namedImports: string[];
};

export type BundleOptions = {
  /**
   * Source code to bundle.
   */
  source: string;
};

export type BundleResult = {
  entryPoint: string;
  assets: Record<string, Uint8Array>;
};

let initialized: Promise<void>;
/**
 * Initializes the bundler.
 * Must be called before using the bundler in browser.
 */
export const initializeBundler = async (options: { wasmUrl: string }) => {
  await (initialized ??= initialize({
    wasmURL: options.wasmUrl,
  }));
};

/**
 * ESBuild bundler implemented as a function (parity with native bundler API style).
 * Bundles source code directly, does not really on filesystem or Node APIs.
 *
 * This is browser friendly version of the bundler, but it could also be used in Node environment.
 * `initializeBundler` should be called before using it in browser, not required in Node.
 */
export const bundleFunction = async ({ source }: BundleOptions): Promise<BundleResult> => {
  if (!isNode()) {
    invariant(initialized, 'Compiler not initialized.');
    await initialized;
  }

  const virtualOutDir = `/tmp/dxos-functions-bundle-${new Date().toISOString()}-${PublicKey.random().toHex()}`;

  const result = await build({
    platform: 'browser',
    conditions: ['workerd', 'worker', 'browser'],
    metafile: true,
    write: false,
    entryPoints: {
      // Keep output name stable as `index.js` to preserve API.
      index: 'dxos:entrypoint',
    },
    treeShaking: true,
    bundle: true,
    // Note: Filesystem is not used, but esbuild requires `outdir` to be set.
    outdir: virtualOutDir,
    format: 'esm',
    splitting: true,
    external: ['./runtime.js', 'cloudflare:workers', 'functions-service:user-script'],
    plugins: [
      httpPlugin as any as Plugin,
      {
        // Provide a virtual entrypoint that wraps the user handler similar to the native bundler.
        name: 'entrypoint',
        setup: (build: PluginBuild) => {
          build.onResolve({ filter: /^dxos:entrypoint$/ }, () => ({
            path: 'dxos:entrypoint',
            namespace: 'dxos:entrypoint',
          }));
          build.onLoad({ filter: /^dxos:entrypoint$/, namespace: 'dxos:entrypoint' }, () => {
            return {
              contents: trim`
                export default {
                  fetch: async (...args) => {
                    const { wrapFunctionHandler } = await import('https://cdn.jsdelivr.net/npm/@dxos/functions@0.8.4-main.7ace549/+esm');
                    const { wrapHandlerForCloudflare } = await import('https://cdn.jsdelivr.net/npm/@dxos/functions-runtime-cloudflare@0.8.4-main.7ace549/+esm');
                    const { default: handler } = await import('memory:source.tsx');
  
                    //
                    // Wrapper to make the function cloudflare-compatible.
                    //
                    return wrapHandlerForCloudflare(wrapFunctionHandler(handler))(...args);
                  },
                };
              `,
              loader: 'tsx',
            };
          });
        },
      },
      {
        name: 'memory',
        setup: (build) => {
          build.onResolve({ filter: /^\.\/runtime\.js$/ }, ({ path }) => {
            return { path, external: true };
          });

          build.onResolve({ filter: /^dxos:functions$/ }, () => {
            return { path: './runtime.js', external: true };
          });

          build.onResolve({ filter: /^memory:/ }, ({ path }) => {
            return { path: path.split(':')[1], namespace: 'memory' };
          });

          build.onLoad({ filter: /.*/, namespace: 'memory' }, ({ path }) => {
            if (path === 'source.tsx') {
              return {
                contents: source,
                loader: 'tsx',
              };
            }
          });
        },
      },
    ],
  });

  if (result.errors.length > 0) {
    throw new BundleCreationError(result.errors);
  }

  log.info('Bundling complete', result.metafile);
  log.info('Output files', result.outputFiles);
  const normalizePath = (path: string) => path.replace(virtualOutDir + '/', '');
  const assets = Object.fromEntries(result.outputFiles?.map((file) => [normalizePath(file.path), file.contents]));

  const entryPoint = 'index.js';

  return {
    entryPoint,
    assets,
  };
};
