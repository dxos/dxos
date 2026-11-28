//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/**
 * Bundles into `dist/extension.cjs`: VS Code loads extensions as CommonJS and provides `vscode` itself.
 * oxc-parser is ESM that resolves its native binding from `import.meta.url`, which CJS lacks, so the bundle defines it
 * as the bundle's own URL and the binding is copied beside it as the `./parser.<platform>.node` the loader tries first.
 */
mkdirSync(dist, { recursive: true });
await build({
  entryPoints: [join(root, 'src/extension.ts')],
  outfile: join(dist, 'extension.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode', '@oxc-parser/*', '*.node'],
  banner: { js: "const __importMetaUrl = require('node:url').pathToFileURL(__filename).href;" },
  define: { 'import.meta.url': '__importMetaUrl' },
  legalComments: 'none',
  minify: true,
  logLevel: 'warning',
});

for (const file of readdirSync(dist)) {
  if (file.endsWith('.node')) {
    rmSync(join(dist, file));
  }
}
const require = createRequire(import.meta.url);
const oxcManifest = require.resolve('oxc-parser/package.json');
const oxcRequire = createRequire(oxcManifest);
const bindings = Object.keys(JSON.parse(readFileSync(oxcManifest, 'utf8')).optionalDependencies ?? {});
let copied = 0;
for (const binding of bindings) {
  let manifest: string;
  try {
    manifest = oxcRequire.resolve(`${binding}/package.json`);
  } catch {
    // pnpm installs only the bindings for this machine's platform.
    continue;
  }
  for (const file of readdirSync(dirname(manifest))) {
    if (file.endsWith('.node') && !existsSync(join(dist, file))) {
      copyFileSync(join(dirname(manifest), file), join(dist, file));
      copied++;
    }
  }
}
if (copied === 0) {
  console.warn('No oxc-parser native binding found; the extension will fall back to the language server.');
}
