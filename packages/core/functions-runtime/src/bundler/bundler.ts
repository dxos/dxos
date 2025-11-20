//
// Copyright 2023 DXOS.org
//

import { type BuildOptions, type BuildResult, type Plugin, type PluginBuild, build, initialize } from 'esbuild-wasm';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

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

  platform: BuildOptions['platform'];
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
      asset: Uint8Array;
      bundle: string;
    };

let initialized: Promise<void>;
export const initializeBundler = async (options: { wasmUrl: string }) => {
  await (initialized ??= initialize({
    wasmURL: options.wasmUrl,
  }));
};

/**
 * In-browser ESBuild bundler implemented as a function (parity with native bundler API style).
 */
export const bundleFunction = async ({ source, platform }: BundleOptions): Promise<BundleResult> => {
  const sourceHash = Buffer.from(await subtleCrypto.digest('SHA-256', Buffer.from(source)));

  if (platform === 'browser') {
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
      bundle: true,
      format: 'esm',
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
                contents: [
                  `import { wrapFunctionHandler } from 'dxos:functions';`,
                  `import handler from 'memory:source.tsx';`,
                  `export default wrapFunctionHandler(handler);`,
                ].join('\n'),
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

    log.info('Bundling complete', result.metafile);
    log.info('Output files', result.outputFiles);

    const entryPoint = 'index.js';
    return {
      timestamp: Date.now(),
      sourceHash,
      imports: analyzeImports(result),
      entryPoint,
      asset: result.outputFiles![0].contents,
      bundle: result.outputFiles![0].text,
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
