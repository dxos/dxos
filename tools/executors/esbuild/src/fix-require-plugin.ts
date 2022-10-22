//
// Copyright 2022 DXOS.org
//

import { Plugin } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

/**
 * When compiling to ESM, esbuild will rewrite all `require` calls to `__require`; which throw runtime errors.
 * This plugin changes `__require` back to `require`.
 */
export const fixRequirePlugin = (): Plugin => ({
  name: 'fix-require',
  setup: (build) => {
    build.onEnd((args) => {
      if (!args.metafile) {
        throw new Error('Metafile is require for fixRequirePlugin');
      }

      for (const file of Object.keys(args.metafile.outputs)) {
        const content = readFileSync(file, 'utf-8');
        const fixedContent = processOutput(content);
        writeFileSync(file, fixedContent, 'utf-8');
      }
    });
  }
});

const processOutput = (output: string) => {
  return output.replace(/__require\(/g, 'require(');
};
