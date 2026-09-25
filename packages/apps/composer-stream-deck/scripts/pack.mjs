//
// Copyright 2026 DXOS.org
//

/**
 * Zips the assembled plugin into the `.streamDeckPlugin` installer a user can double-click.
 *
 * The archive contains the `<uuid>.sdPlugin` directory itself, not its contents, which is what the
 * Stream Deck application expects to unpack.
 *
 * Usage: node scripts/pack.mjs [--out <path>]
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(projectRoot, 'assets/manifest.json'), 'utf8'));
const sourceDir = `${manifest.UUID}.sdPlugin`;

if (!existsSync(join(projectRoot, sourceDir))) {
  console.error(`Assembled plugin not found: ${sourceDir}`);
  console.error('Run `moon run composer-stream-deck:assemble` first.');
  process.exit(1);
}

const outArgIdx = process.argv.indexOf('--out');
const outValue = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : undefined;
if (outArgIdx !== -1 && (!outValue || outValue.startsWith('-'))) {
  console.error('--out requires a value');
  process.exit(1);
}
const outPath = outValue ? resolve(outValue) : join(projectRoot, 'composer-stream-deck.streamDeckPlugin');

// `zip` refuses to overwrite entries, so a stale archive would keep removed files.
await rm(outPath, { force: true });

// The system `zip` command, as used by composer-crx's pack script.
const result = spawnSync('zip', ['-r', outPath, sourceDir], { cwd: projectRoot, stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error(`zip exited with code ${result.status}`);
}

console.log(`Packed: ${outPath}`);
