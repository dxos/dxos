//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bundles the guest runtime — effect, @dxos/echo, @dxos/compute and `src/guest` — into the one IIFE
 * script the djs VM loads, plus its hash, which keys base images and snapshots to this bundle.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, 'dist', 'guest');

const result = await build({
  entryPoints: [join(root, 'src', 'guest', 'entry.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  // The browser builds of the workspace packages, from source: the VM is closer to a web worker
  // than to node, and no package needs to be built first.
  platform: 'browser',
  conditions: ['source', 'browser'],
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  alias: {
    'node:util': join(root, 'src', 'guest', 'shims', 'util.ts'),
    'node:crypto': join(root, 'src', 'guest', 'shims', 'crypto.ts'),
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
  metafile: true,
});

const [output] = result.outputFiles;
const hash = createHash('sha256').update(output.contents).digest('hex').slice(0, 16);
await mkdir(outdir, { recursive: true });
await writeFile(join(outdir, 'guest.js'), output.contents);
await writeFile(join(outdir, 'guest.json'), JSON.stringify({ hash, bytes: output.contents.byteLength }, null, 2));
await writeFile(join(outdir, 'meta.json'), JSON.stringify(result.metafile));
console.log(`guest bundle: ${(output.contents.byteLength / 1024).toFixed(0)} KiB, hash ${hash}`);
