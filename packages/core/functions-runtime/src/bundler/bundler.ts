//
// Copyright 2023 DXOS.org
//

import { type BuildOptions, type BuildResult, type Plugin, build, initialize } from 'esbuild-wasm';

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

export type BundlerOptions = {
  platform: BuildOptions['platform'];
  sandboxedModules: string[];
  remoteModules: Record<string, string>;
};

let initialized: Promise<void>;
export const initializeBundler = async (options: { wasmUrl: string }) => {
  await (initialized ??= initialize({
    wasmURL: options.wasmUrl,
  }));
};

/**
 * In-browser ESBuild bundler.
 */
export class Bundler {
  constructor(private readonly _options: BundlerOptions) {}

  async bundle({ source }: BundleOptions): Promise<BundleResult> {
    const { sandboxedModules: providedModules, ...options } = this._options;
    const sourceHash = Buffer.from(await subtleCrypto.digest('SHA-256', Buffer.from(source)));

    if (this._options.platform === 'browser') {
      invariant(initialized, 'Compiler not initialized.');
      await initialized;
    }

    const imports = source ? analyzeSourceFileImports(source) : [];

    // https://esbuild.github.io/api/#build
    try {
      const result = await build({
        platform: options.platform,
        conditions: ['workerd', 'browser'],
        metafile: true,
        write: false,
        entryPoints: {
          // Gets mapped to `userFunc.js` by esbuild.
          userFunc: 'memory:main.tsx',
        },
        bundle: true,
        format: 'esm',
        plugins: [
          httpPlugin as unknown as Plugin,
          {
            name: 'memory',
            setup: (build) => {
              build.onResolve({ filter: /^\.\/runtime\.js$/ }, ({ path }) => {
                return { path, external: true };
              });

              build.onResolve({ filter: /^dxos:functions$/ }, ({ path }) => {
                return { path: './runtime.js', external: true };
              });

              build.onResolve({ filter: /^memory:/ }, ({ path }) => {
                return { path: path.split(':')[1], namespace: 'memory' };
              });

              build.onLoad({ filter: /.*/, namespace: 'memory' }, ({ path }) => {
                if (path === 'main.tsx') {
                  return {
                    contents: source,
                    loader: 'tsx',
                  };
                }
              });

              for (const module of providedModules) {
                build.onResolve({ filter: new RegExp(`^${module}$`) }, ({ path }) => {
                  return { path, namespace: 'injected-module' };
                });
              }

              build.onLoad({ filter: /.*/, namespace: 'injected-module' }, ({ path }) => {
                const namedImports = imports.find((entry) => entry.moduleIdentifier === path)?.namedImports ?? [];
                return {
                  contents: `
                  const { ${namedImports.join(',')} } = window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(path)}];
                  export { ${namedImports.join(',')} };
                  export default window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(path)}].default;
                `,
                  loader: 'tsx',
                };
              });
            },
          },
        ],
      });

      log('compile complete', result.metafile);

      const entryPoint = 'userFunc.js';
      return {
        timestamp: Date.now(),
        sourceHash,
        imports: this.analyzeImports(result),
        entryPoint,
        asset: result.outputFiles![0].contents,
        bundle: result.outputFiles![0].text,
      };
    } catch (err) {
      return { timestamp: Date.now(), sourceHash, error: err };
    }
  }

  // TODO(dmaretskyi): In the future we can replace the compiler with SWC with plugins running in WASM.
  analyzeImports(result: BuildResult): Import[] {
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
  }

  analyzeSourceFileImports(code: string): {
    defaultImportName: string;
    namedImports: string[];
    wildcardImportName: string;
    moduleIdentifier: string;
    quotes: string;
  }[] {
    // TODO(dmaretskyi): Support import aliases and wildcard imports.
    const parsedImports = allMatches(IMPORT_REGEX, code);
    return parsedImports.map((capture) => {
      return {
        defaultImportName: capture[1],
        namedImports: capture[2]?.split(',').map((importName) => importName.trim()),
        wildcardImportName: capture[3],
        moduleIdentifier: capture[4],
        quotes: capture[5],
      };
    });
  }
}

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

type ParsedImport = {
  defaultImportName?: string;
  namedImports: string[];
  wildcardImportName?: string;
  moduleIdentifier: string;
  quotes: string;
};

const analyzeSourceFileImports = (code: string): ParsedImport[] => {
  // TODO(dmaretskyi): Support import aliases and wildcard imports.
  const parsedImports = allMatches(IMPORT_REGEX, code);
  return parsedImports.map((capture) => {
    return {
      defaultImportName: capture[1],
      namedImports: capture[2]
        ?.trim()
        .slice(1, -1)
        .split(',')
        .map((importName) => importName.trim()),
      wildcardImportName: capture[3],
      moduleIdentifier: capture[4],
      quotes: capture[5],
    };
  });
};
