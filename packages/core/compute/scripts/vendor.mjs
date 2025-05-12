#!/usr/bin/env node

import { build } from 'esbuild';
import { mkdir, rm } from 'fs/promises';

await build({
  entryPoints: {
    hyperformula: './scripts/entry-hyperformula.js',
  },
  outdir: './dist/vendor',
  outExtension: {
    '.js': '.mjs',
  },
  bundle: true,
  format: 'esm',
  plugins: [
    {
      name: 'clear-dist-plugin',
      setup(build) {
        build.onStart(async () => {
          try {
            await rm(build.initialOptions.outdir, { recursive: true });
          } catch (err) {
            if (err.code !== 'ENOENT') {
              console.error(err);
            }
          }
          await mkdir(build.initialOptions.outdir, { recursive: true });
        });
      },
    },
  ],
});
