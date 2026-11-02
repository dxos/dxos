//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/**
 * Bundles the client into `dist/extension.cjs` (VS Code loads extensions as CommonJS and provides `vscode` itself)
 * and copies the language server's own bundle beside it, so the `.vsix` runs with no `node_modules`.
 */
mkdirSync(dist, { recursive: true });
await build({
  entryPoints: [join(root, 'src/extension.ts')],
  outfile: join(dist, 'extension.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  legalComments: 'none',
  minify: true,
  logLevel: 'warning',
});
copyFileSync(join(root, '../mdl-language-server/dist/server.cjs'), join(dist, 'server.cjs'));
