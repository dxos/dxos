//
// Copyright 2023 DXOS.org
//

import { type BuildOptions } from 'esbuild';
import { build, initialize, type BuildResult, type Plugin } from 'esbuild-wasm';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type Import = {
  moduleUrl: string;
  defaultImport: boolean;
  namedImports: string[];
};

export type BundlerResult = {
  timestamp: number;
  sourceHash: Buffer;
  imports?: Import[];
  bundle?: string;
  error?: any;
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
 * ESBuild bundler.
 */
export class Bundler {
  constructor(private readonly _options: BundlerOptions) {}

  async bundle(source: string): Promise<BundlerResult> {
    const { sandboxedModules: providedModules, ...options } = this._options;

    const createResult = async (result?: Partial<BundlerResult>) => {
      return {
        timestamp: Date.now(),
        sourceHash: Buffer.from(await subtleCrypto.digest('SHA-256', Buffer.from(source))),
        ...result,
      };
    };

    if (this._options.platform === 'browser') {
      invariant(initialized, 'Compiler not initialized.');
      await initialized;
    }

    const imports = analyzeSourceFileImports(source);

    // https://esbuild.github.io/api/#build
    try {
      const result = await build({
        platform: options.platform,
        conditions: ['workerd', 'browser'],
        metafile: true,
        write: false,
        entryPoints: ['memory:main.tsx'],
        bundle: true,
        format: 'esm',
        plugins: [
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
          httpPlugin,
        ],
      });

      log('compile complete', result.metafile);

      return await createResult({
        imports: this.analyzeImports(result),
        bundle: result.outputFiles![0].text,
      });
    } catch (err) {
      return await createResult({ error: err });
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

  analyzeSourceFileImports(code: string) {
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
  regex.lastIndex = 0;

  let match;
  const matches = [];
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

const httpPlugin: Plugin = {
  name: 'http',
  setup: (build) => {
    // Intercept import paths starting with "http:" and "https:" so esbuild doesn't attempt to map them to a file system location.
    // Tag them with the "http-url" namespace to associate them with this plugin.
    build.onResolve({ filter: /^https?:\/\// }, (args) => ({
      path: args.path,
      namespace: 'http-url',
    }));

    // We also want to intercept all import paths inside downloaded files and resolve them against the original URL.
    // All of these files will be in the "http-url" namespace.
    // Make sure to keep the newly resolved URL in the "http-url" namespace so imports inside it will also be resolved as URLs recursively.
    build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: 'http-url',
    }));

    // When a URL is loaded, we want to actually download the content from the internet.
    // This has just enough logic to be able to handle the example import from unpkg.com but in reality this would probably need to be more complex.
    build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
      const response = await fetch(args.path);
      return { contents: await response.text(), loader: 'jsx' };
    });
  },
};
