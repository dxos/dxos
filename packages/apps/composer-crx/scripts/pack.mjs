//
// Copyright 2026 DXOS.org
//

/**
 * Zip the composer-crx build output for Chrome Web Store upload.
 *
 * Usage: node scripts/pack.mjs [--out <path>]
 *   --out  Path for the output .zip file (default: composer-crx.zip next to package.json).
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { getCanonicalDistPath } = await import(pathToFileURL(join(projectRoot, 'scripts/canonical-dist.mjs')).href);
const distDir = getCanonicalDistPath(projectRoot);

if (!existsSync(distDir)) {
  console.error(`Build output not found: ${distDir}`);
  console.error('Run `moon run composer-crx:bundle` first.');
  process.exit(1);
}

// Parse --out argument.
const outArgIdx = process.argv.indexOf('--out');
const outValue = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : undefined;
if (outArgIdx !== -1 && (!outValue || outValue.startsWith('-'))) {
  console.error('--out requires a value');
  process.exit(1);
}
const zipPath = outValue ? resolve(outValue) : join(projectRoot, 'composer-crx.zip');

// Use the system `zip` command which is present on all macOS/Linux CI environments.
await zipDir(distDir, zipPath);

console.log(`Packed: ${zipPath}`);
console.log(`Source: ${distDir}`);

async function zipDir(sourceDir, outPath) {
  const { spawnSync } = await import('node:child_process');

  // Run zip from inside the source dir so paths inside the archive are relative.
  const result = spawnSync('zip', ['-r', outPath, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`zip exited with code ${result.status}`);
  }
}
