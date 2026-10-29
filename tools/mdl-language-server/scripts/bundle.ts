//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
    legalComments: 'none',
    logLevel: 'warning',
  });

await bundle(process.argv[2] ?? join(root, 'dist/server.cjs'));
