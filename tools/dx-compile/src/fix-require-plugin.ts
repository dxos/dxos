//
// Copyright 2023 DXOS.org
//

import { readFile, writeFile } from 'fs/promises';

import { type Plugin } from 'esbuild';

/**
 * When compiling to ESM, esbuild will rewrite all `require` calls to `__require`; which throw runtime errors.
 * This plugin changes `__require` back to `require`.
 *
 * More information in this thread: https://github.com/evanw/esbuild/issues/946.
 * TL;DR: Currently it's the best way to have CJS externals in ESM bundles for the browser.
 *
 * This code won't work in node JS unless we add a banner that does `const require = createRequire(import.meta.url);`.
 * It does work when passed through another bundler (e.g. vite). And allows us to emit CJS deps as separate chunks.
 */
export const fixRequirePlugin = (): Plugin => ({
  name: 'fix-require',
  setup: (build) => {
    build.onEnd(async (args) => {
      if (args.errors.length > 0) {
        return;
      }

      if (!args.metafile) {
        throw new Error('Metafile is require for fixRequirePlugin');
      }

      for (const file of Object.keys(args.metafile.outputs)) {
        const content = await readFile(file, 'utf-8');
        const fixedContent = processOutput(content);
        await writeFile(file, fixedContent, 'utf-8');
      }
    });
  },
});

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z]/g, '_');

const processOutput = (output: string) => {
  const defaultImports = [...new Set([...output.matchAll(/var ([^{}\n]+?) = __require\("(.+?)"\)/g)].map((m) => m[2]))]
    .map((module) => `import import$d$${sanitizeId(module)} from '${module}';`)
    .join('\n');
  const namedImports = [...new Set([...output.matchAll(/var {([\s\S]+?)} = __require\("(.+?)"\)/g)].map((m) => m[2]))]
    .map((module) => `import * as import$n$${sanitizeId(module)} from '${module}';`)
    .join('\n');

  const withDefaultImports = [...output.matchAll(/var [^{}\n]+? = __require\("(.+?)"\)/g)].reduce((acc, m) => {
    const next = m[0].replace(`__require("${m[1]}")`, `import$d$${sanitizeId(m[1])}`);
    return acc.replace(m[0], next);
  }, output);
  const withNamedImports = [...output.matchAll(/var {[\s\S]+?} = __require\("(.+?)"\)/g)].reduce((acc, m) => {
    const next = m[0].replace(`__require("${m[1]}")`, `import$n$${sanitizeId(m[1])}`);
    return acc.replace(m[0], next);
  }, withDefaultImports);

  const [banner, ...rest] = withNamedImports.split('\n');
  if (banner === 'import "@dxos/node-std/globals";') {
    return [banner, defaultImports, namedImports, rest.join('\n')].filter((str) => str.length > 0).join('\n');
  }

  return [defaultImports, namedImports, withNamedImports].filter((str) => str.length > 0).join('\n');
};
