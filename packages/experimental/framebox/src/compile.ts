//
// Copyright 2023 DXOS.org
//

import { initialize, build, Metafile, BuildResult } from 'esbuild-wasm';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';

import { sha256 } from '@dxos/crypto';

import { Frame, Import } from './proto/gen/schema';

let initializePromise;

export const compile = async (frame: Frame) => {
  await (initializePromise ??= initialize({
    wasmURL: esbuildWasmURL
  }));

  const source = frame.content.doc!.getText('monaco').toString();

  const output = await build({
    entryPoints: ['echofs:main.tsx'],
    outdir: 'dist',
    platform: 'browser',
    format: 'esm',
    metafile: true,
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
                loader: 'tsx'
              };
            }
          });
        }
      }
    ]
  });

  frame.compiled = {
    sourceHash: Buffer.from(sha256(source), 'hex'),
    bundle: output.outputFiles![0].text,
    imports: analyzeImports(output)
  };
};

// TODO(dmaretskyi): This looks pretty bad but should work fine in short term.
//                   In the future we can replace the compiler with SWC with plugins running in WASM.
function analyzeImports(build: BuildResult): Import[] {
  const parsedImports = allMatches(IMPORT_REGEX, build.outputFiles![0].text);

  // TODO(dmaretskyi): Support import aliases and wildcard imports.
  return Object.values(build.metafile!.outputs)[0].imports.map((entry): Import => {
    const parsedImport = parsedImports.find(capture => capture?.[4] === entry.path);

    const namedImports: string[] = [];
    if(parsedImport?.[2]) {
      NAMED_IMPORTS_REGEX.lastIndex = 0;
      const namedImportsMatch = NAMED_IMPORTS_REGEX.exec(parsedImport[2]);
      if(namedImportsMatch) {
        namedImportsMatch[1].split(',').forEach(importName => {
          namedImports.push(importName.trim());
        });
      }
    }

    return {
      moduleUrl: entry.path,
      defaultImport: !!parsedImport?.[1],
      namedImports,
    }
  })
}


// https://regex101.com/r/FEN5ks/1
// https://stackoverflow.com/a/73265022
// $1 = default import name (can be non-existent)
// $2 = destructured exports (can be non-existent)
// $3 = wildcard import name (can be non-existent)
// $4 = module identifier
// $5 = quotes used (either ' or ")
const IMPORT_REGEX = /import(?:(?:(?:[ \n\t]+([^ *\n\t\{\},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'\{\}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t\{\}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/gm;


const NAMED_IMPORTS_REGEX = /[ \n\t]*\{((?:[ \n\t]*[^ \n\t"'\{\}]+[ \n\t]*,?)+)\}[ \n\t]*/gm;

const allMatches = (regex: RegExp, str: string) => {
  regex.lastIndex = 0;
  const matches = [];
  let match;
  while ((match = regex.exec(str))) {
    matches.push(match);
  }
  return matches;
}