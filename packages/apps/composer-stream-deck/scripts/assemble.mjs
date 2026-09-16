//
// Copyright 2026 DXOS.org
//

/**
 * Assembles the `<uuid>.sdPlugin` directory that the Stream Deck application loads.
 *
 * Elgato derives the directory name from the manifest UUID, so it is a build output rather than a
 * source tree: this copies the compiled entry into `bin/`, the images alongside it, and writes the
 * manifest with its four-part version derived from package.json.
 *
 * Usage: node scripts/assemble.mjs
 */

import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(projectRoot, 'assets/manifest.json'), 'utf8'));

const entry = join(projectRoot, 'dist/lib/plugin.mjs');
if (!existsSync(entry)) {
  console.error(`Build output not found: ${entry}`);
  console.error('Run `moon run composer-stream-deck:build` first.');
  process.exit(1);
}

// Elgato requires {major}.{minor}.{patch}.{build}; the package carries three parts.
const [major = '0', minor = '0', patch = '0'] = pkg.version.split('.');
manifest.Version = `${major}.${minor}.${patch}.0`;

const outDir = join(projectRoot, `${manifest.UUID}.sdPlugin`);
await rm(outDir, { recursive: true, force: true });
await mkdir(join(outDir, 'bin'), { recursive: true });

await cp(entry, join(outDir, 'bin/plugin.mjs'));
if (existsSync(`${entry}.map`)) {
  await cp(`${entry}.map`, join(outDir, 'bin/plugin.mjs.map'));
}
await cp(join(projectRoot, 'assets/imgs'), join(outDir, 'imgs'), { recursive: true });
await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Assembled: ${outDir}`);
console.log(`Version:   ${manifest.Version}`);
