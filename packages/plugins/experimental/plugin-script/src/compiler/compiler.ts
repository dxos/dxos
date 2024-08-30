//
// Copyright 2023 DXOS.org
//

import { type BuildOptions } from 'esbuild';
import { build, initialize, type BuildResult } from 'esbuild-wasm';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';

export type Import = {
  moduleUrl: string;
  defaultImport: boolean;
  namedImports: string[];
};

export type CompilerResult = {
  timestamp: number;
  sourceHash: Buffer;
  imports?: Import[];
  bundle?: string;
  error?: any;
};

export type CompilerOptions = {
  platform: BuildOptions['platform'];
  providedModules: string[];
};

let initialized: Promise<void>;
export const initializeCompiler = async (options: { wasmURL: string }) => {
  await (initialized ??= initialize({
    wasmURL: options.wasmURL,
  }));
};

/**
 * ESBuild compiler.
 */
export class Compiler {
  constructor(private readonly _options: CompilerOptions) {}

  async compile(source: string): Promise<CompilerResult> {
    const { providedModules, ...options } = this._options;

    const createResult = async (result?: Partial<CompilerResult>) => {
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
        ...options,
        metafile: true,
        write: false,
        entryPoints: ['memory:main.tsx'],
        bundle: true,
        format: 'esm',
        plugins: [
          {
            name: 'memory',
            setup: (build) => {
              build.onResolve({ filter: /^memory:/ }, ({ path }) => {
                return { path: path.split(':')[1], namespace: 'memory' };
              });

              build.onLoad({ filter: /.*/, namespace: 'memory' }, ({ path }) => {
                const imports = ["import React from 'react';"];
                if (path === 'main.tsx') {
                  return {
                    contents: [...imports, source].join('\n'),
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
