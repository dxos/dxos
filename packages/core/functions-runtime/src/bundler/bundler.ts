//
// Copyright 2023 DXOS.org
//

import { type BuildResult, type Plugin, type PluginBuild, build, initialize } from 'esbuild-wasm';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNode, trim } from '@dxos/util';

import { httpPlugin } from './plugins/http-plugin-esbuild';
import { PluginR2VendoredPackages } from './plugins/r2-vendored-packages';

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

export type BundleResult =
  | {
      timestamp: number;
      sourceHash: Buffer;
      error: unknown;
    }
  | {
      timestamp: number;
      sourceHash: Buffer;
      imports: Import[];
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
  const sourceHash = Buffer.from(await subtleCrypto.digest('SHA-256', Buffer.from(source)));

  if (!isNode()) {
    invariant(initialized, 'Compiler not initialized.');
    await initialized;
  }
  const outdir = '/tmp/bundle';
  try {
    const result = await build({
      platform: 'browser',
      conditions: ['workerd', 'worker', 'browser'],
      metafile: true,
      write: false,
      entryPoints: {
        // Keep output name stable as `index.js` to preserve API.
        index: 'dxos:entrypoint',
      },
      outdir,
      bundle: true,

      // NOTE: Splitting causes an error in Cloudflare-Workers:
      //   Disallowed operation called within global scope.
      //   Asynchronous I/O (ex: fetch() or connect()), setting a timeout, and generating random values are not allowed within global scope.
      //   To fix this error, perform this operation within a handler. https://developers.cloudflare.com/workers/runtime-apis/handlers/
      //
      // Likely, workerd is treating asynchronously-loaded modules as if they were executing in global scope.
      // splitting: true,
      format: 'esm',
      target: 'esnext',
      supported: {
        'class-private-accessor': true,
        'class-private-brand-check': true,
        'class-private-field': true,
        'class-private-method': true,
        'class-private-static-accessor': true,
        'class-private-static-field': true,
        'class-private-static-method': true,
      },
      external: ['cloudflare:workers'],
      alias: {
        'node:path': 'path',
      },
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
            // TODO(dmaretskyi): Move into memory plugin
            build.onLoad({ filter: /^dxos:entrypoint$/, namespace: 'dxos:entrypoint' }, () => {
              return {
                contents: trim`
                  export default {
                    fetch: async (...args) => {
                      const { wrapFunctionHandler } = await import('@dxos/functions');
                      const { wrapHandlerForCloudflare } = await import('@dxos/functions-runtime-cloudflare');
                      const { default: handler } = await import('memory:source.tsx');

                      //
                      // Wrapper to make the function cloudflare-compatible.
                      //
                      return wrapHandlerForCloudflare(wrapFunctionHandler(handler))(...args);
                    },
                  };
                `,
                loader: 'ts',
              } as const;
            });
          },
        },
        {
          name: 'memory',
          setup: (build) => {
            build.onResolve({ filter: /^memory:/ }, ({ path }) => {
              return { path: path.split(':')[1], namespace: 'memory' };
            });

            build.onLoad({ filter: /.*/, namespace: 'memory' }, ({ path }) => {
              switch (path) {
                case 'source.tsx':
                  return {
                    contents: source,
                    loader: 'tsx',
                  };
                case 'empty':
                  return {
                    contents: '',
                    loader: 'js',
                  };
              }
            });
          },
        },
        // PluginESMSh(),
        PluginR2VendoredPackages(),
      ],
    });

    // log.info('Bundling complete', result.metafile);
    // log.info('Output files', { files: result.outputFiles });

    const entryPoint = 'index.js';
    return {
      timestamp: Date.now(),
      sourceHash,
      imports: analyzeImports(result),
      entryPoint,
      assets: result.outputFiles.reduce(
        (acc, file) => {
          acc[file.path.replace(outdir + '/', '')] = file.contents;
          return acc;
        },
        {} as Record<string, Uint8Array>,
      ),
    };
  } catch (err) {
    return { timestamp: Date.now(), sourceHash, error: err };
  }
};

// TODO(dmaretskyi): In the future we can replace the compiler with SWC with plugins running in WASM.
const analyzeImports = (result: BuildResult): Import[] => {
  invariant(result.outputFiles);

  // TODO(dmaretskyi): Support import aliases and wildcard imports.
  const parsedImports = allMatches(IMPORT_REGEX, result.outputFiles[0].text);
  return Object.values(result.metafile!.outputs)[0].imports.map((entry): Import => {
    const namedImports: string[] = [];
    const parsedImport = parsedImports.find((capture) => capture?.[4] === entry.path);
    if (parsedImport?.[2]) {
      NAMED_IMPORTS_REGEX.lastIndex = 0;
      const namedImportsMatch = NAMED_IMPORTS_REGEX.exec(parsedImport[2]);
      if (namedImportsMatch) {
        namedImportsMatch[1].split(',').forEach((importName) => {
          namedImports.push(importName.trim());
        });
      }
    }

    return {
      moduleUrl: entry.path,
      defaultImport: !!parsedImport?.[1],
      namedImports,
    };
  });
};

// https://regex101.com/r/FEN5ks/1
// https://stackoverflow.com/a/73265022
// $1 = default import name (can be non-existent)
// $2 = destructured exports (can be non-existent)
// $3 = wildcard import name (can be non-existent)
// $4 = module identifier
// $5 = quotes used (either ' or ")
const IMPORT_REGEX =
  /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/gm;

const NAMED_IMPORTS_REGEX = /[ \n\t]*{((?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+)}[ \n\t]*/gm;

const allMatches = (regex: RegExp, str: string) => {
  let match;
  const matches = [];
  regex.lastIndex = 0;
  while ((match = regex.exec(str))) {
    matches.push(match);
  }

  return matches;
};
