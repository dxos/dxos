//
// Copyright 2022 DXOS.org
//

import { Plugin } from 'esbuild';
import { readFile, writeFile } from 'fs/promises';

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
      if (!args.metafile) {
        throw new Error('Metafile is require for fixRequirePlugin');
      }

      for (const file of Object.keys(args.metafile.outputs)) {
        const content = await readFile(file, 'utf-8');
        const fixedContent = processOutput(content);
        await writeFile(file, fixedContent, 'utf-8');
      }
    });
  }
});

const processOutput = (output: string) => {
  return output.replace(/__require\(/g, 'require(');
};
