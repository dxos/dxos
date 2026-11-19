//
// Copyright 2026 DXOS.org
//

import { type Plugin, build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Vite's `?raw` suffix, which deus uses to inline its dialect specs (`lang/*.mdl?raw`) as strings. */
const raw: Plugin = {
  name: 'raw',
  setup: (build) => {
    build.onResolve({ filter: /\?raw$/ }, ({ path, resolveDir }) => ({
      path: resolve(resolveDir, path.slice(0, -'?raw'.length)),
      namespace: 'raw',
    }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, async ({ path }) => ({
      contents: await readFile(path, 'utf8'),
      loader: 'text',
    }));
  },
};

/**
 * Bundles the server and everything it imports into one CommonJS file, so an editor runs it with plain `node` and no
 * `node_modules`. The `source` condition reads workspace packages from their sources, so no package build is needed.
 */
const bundle = async (outfile: string) =>
  build({
    entryPoints: [join(root, 'src/bin/server.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    conditions: ['source'],
    banner: { js: '#!/usr/bin/env node' },
    plugins: [raw],
    legalComments: 'none',
    logLevel: 'warning',
  });

await bundle(process.argv[2] ?? join(root, 'dist/server.cjs'));
