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
  sourceHash: Buffer;
  bundle: string;
  imports: Import[];
};

export type CompilerOptions = {
  platform: BuildOptions['platform'];
};

let initialized: Promise<void>;
export const initializeCompiler = async (options: { wasmURL: string }) => {
  await (initialized ??= initialize({
    wasmURL: options.wasmURL,
  }));
};

/**
 * ESBuild compiler.
 * https://esbuild.github.io/api/#build
 */
export class Compiler {
  constructor(private readonly _options: CompilerOptions) {}

  async compile(source: string): Promise<CompilerResult> {
    invariant(initialized, 'Compiler not initialized.');
    await initialized;

    const result = await build({
      format: 'esm',
      metafile: true,
      write: false,
      ...this._options,
      entryPoints: ['echofs:main.tsx'],
      outdir: 'dist',
      plugins: [
        {
          name: 'echofs',
          setup: (build) => {
            build.onResolve({ filter: /^echofs:/ }, (args) => {
              return { path: args.path.slice(7), namespace: 'echofs' };
            });
            build.onLoad({ filter: /.*/, namespace: 'echofs' }, async (args) => {
              if (args.path === 'main.tsx') {
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

    return {
      sourceHash: Buffer.from(await subtleCrypto.digest('SHA-256', Buffer.from(source))),
      bundle: result.outputFiles![0].text,
      imports: this.analyzeImports(result),
    };
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
