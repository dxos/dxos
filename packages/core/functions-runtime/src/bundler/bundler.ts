//
// Copyright 2023 DXOS.org
//

import { type BuildResult, type Plugin, type PluginBuild, build, initialize } from 'esbuild-wasm';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNode, trim } from '@dxos/util';
import * as Record from 'effect/Record';
import * as Function from 'effect/Function';

import { httpPlugin } from '../http-plugin-esbuild';
import type { Loader } from 'esbuild';

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
      outdir: '.',
      bundle: true,
      format: 'esm',
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

    log.info('Bundling complete', result.metafile);
    log.info('Output files', { files: result.outputFiles });

    const entryPoint = 'index.js';
    return {
      timestamp: Date.now(),
      sourceHash,
      imports: analyzeImports(result),
      entryPoint,
      assets: result.outputFiles.reduce(
        (acc, file) => {
          acc[file.path] = file.contents;
          return acc;
        },
        {} as Record<string, Uint8Array>,
      ),
    };
  } catch (err) {
    return { timestamp: Date.now(), sourceHash, error: err };
  }
};

/**
 * Pulls NPM packages from `esm.sh`.
 * Always uses latest versions for all packages.
 */
const PluginESMSh = (): Plugin => ({
  name: 'esmsh',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point') {
        return;
      }

      if (args.path.includes('@dxos/node-std')) {
        return {
          path: 'memory:empty',
          namespace: 'memory',
        };
      }

      // Assuming all deps will be resolved the latest version.
      return build.resolve(
        `https://esm.sh/${args.path}?conditions=workerd,worker,node&platform=node&keep-names&deps=@automerge/automerge-repo@2.5.0,msgpackr@1.11.4`,
        {
          kind: args.kind,
          resolveDir: args.resolveDir,
        },
      );
    });
  },
});

/*

node scripts/vendor-packages.mjs
rclone copy dist/vendor r2:script-vendored-packages
https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/r2/default/buckets/script-vendored-packages/settings

*/

// script-vendored-packages bucket on R2
const SCRIPT_PACKAGES_BUCKET = 'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev';

const PluginR2VendoredPackages = (): Plugin => ({
  name: 'r2-vendored-packages',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point') {
        return;
      }

      return {
        path: new URL(`/${args.path}.js`, SCRIPT_PACKAGES_BUCKET).href,
        namespace: 'http-url',
      };
    });

    // We also want to intercept all import paths inside downloaded files and resolve them against the original URL.
    // All of these files will be in the "http-url" namespace.
    // Make sure to keep the newly resolved URL in the "http-url" namespace so imports inside it will also be resolved as URLs recursively.
    build.onResolve({ filter: /.*/, namespace: 'r2-vendored-packages' }, (args) => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: 'r2-vendored-packages',
    }));

    build.onLoad({ filter: /.*/, namespace: 'r2-vendored-packages' }, async (args) => {
      log.info('Fetching', { path: args.path });
      try {
        const response = await fetch(args.path);
        const extension = new URL(args.path).pathname.split('.').pop() || '';
        const text = await response.text();
        const loader =
          ((
            {
              js: 'js',
              jsx: 'jsx',
              ts: 'ts',
              tsx: 'tsx',
              // Add more mappings as needed
            } as const
          )[extension.toLowerCase()] as Loader) || 'jsx';
        return {
          contents: text,
          loader,
        } as const;
      } catch (err) {
        log.error('failed to fetch', { path: args.path });
        throw err;
      }
    });
  },
});

const PluginEmbeddedVendoredPackages = (): Plugin => ({
  name: 'embedded-vendored-packages',
  setup(build) {
    // // https://vite.dev/guide/features#custom-queries
    const moduleUrls = Function.pipe(
      import.meta.glob('../../dist/vendor/**/*.js', {
        query: '?url',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
      Record.mapKeys((s) => s.replace('../../dist/vendor/', '').replace(/\.js$/, '')),
      Record.filter((_, key) => !key.startsWith('internal/')),
    );

    // console.log(moduleUrls);

    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point') {
        return;
      }

      return build.resolve(new URL(moduleUrls[args.path], import.meta.url).href, {
        kind: args.kind,
        resolveDir: args.resolveDir,
      });
    });
  },
});

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
