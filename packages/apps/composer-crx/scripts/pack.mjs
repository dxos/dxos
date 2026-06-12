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
import { dirname, join, relative, resolve } from 'node:path';
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
const zipPath = outArgIdx !== -1 ? resolve(process.argv[outArgIdx + 1]) : join(projectRoot, 'composer-crx.zip');

// Use the built-in zip via Node.js streams + archiver if available, otherwise fall back to the
// system `zip` command which is present on all macOS/Linux CI environments.
await zipDir(distDir, zipPath);

console.log(`Packed: ${zipPath}`);
console.log(`Source: ${distDir}`);

async function zipDir(sourceDir, outPath) {
  // Try the system `zip` command first (always available in CI and on macOS/Linux).
  const { spawnSync } = await import('node:child_process');
  const rel = relative(sourceDir, outPath);

  // Run zip from inside the source dir so paths inside the archive are relative.
  const result = spawnSync('zip', ['-r', outPath, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`zip exited with code ${result.status}`);
  }
}
