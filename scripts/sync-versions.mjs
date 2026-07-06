#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Stamps source version files from their owning package's version, so generated artifacts match the
// version Changesets assigned. Run inside `changeset:version`:
//   - `version.ts` (DXOS_VERSION) for @dxos/client, @dxos/client-services (Group A) and @dxos/cli (Group B).
//   - `tauri.conf.json` ($.version) for the Composer desktop build (composer-app's own independent line).
//
// Each target tracks the version of the package it lives in — no group assumption — so it stays correct
// regardless of how the fixed groups are drawn. Pass `--check` to fail (exit 1) if anything is out of sync.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

// Each version.ts tracks the version of the package directory it lives in.
const VERSION_TS = ['packages/sdk/client', 'packages/sdk/client-services', 'packages/devtools/cli'].map((pkgDir) => ({
  versionFile: join(ROOT, pkgDir, 'src/version.ts'),
  packageFile: join(ROOT, pkgDir, 'package.json'),
}));

const TAURI = {
  configFile: join(ROOT, 'packages/apps/composer-app/src-tauri/tauri.conf.json'),
  packageFile: join(ROOT, 'packages/apps/composer-app/package.json'),
};

const readVersion = (packageFile) => JSON.parse(readFileSync(packageFile, 'utf8')).version;

const drift = [];

const writeOrCheck = (file, current, next, label) => {
  if (current === next) {
    return;
  }
  if (CHECK) {
    drift.push(`  ${label}: ${file}`);
    return;
  }
  writeFileSync(file, next);
  console.log(`Stamped ${label}: ${file}`);
};

for (const { versionFile, packageFile } of VERSION_TS) {
  const version = readVersion(packageFile);
  const source = readFileSync(versionFile, 'utf8');
  // Replace only the version literal; preserve the rest of the line (incl. any trailing marker comment).
  const next = source.replace(/(export const DXOS_VERSION = ')[^']*(')/, `$1${version}$2`);
  writeOrCheck(versionFile, source, next, `DXOS_VERSION=${version}`);
}

{
  const version = readVersion(TAURI.packageFile);
  const source = readFileSync(TAURI.configFile, 'utf8');
  // Minimal edit of the top-level `"version"` key only — preserves the file's formatting and avoids
  // touching the `{{current_version}}` template inside the updater endpoint URL.
  const next = source.replace(/^(\s*"version":\s*")[^"]*(")/m, `$1${version}$2`);
  writeOrCheck(TAURI.configFile, source, next, `tauri version=${version}`);
}

if (CHECK && drift.length > 0) {
  console.error('ERROR: version files are out of sync with their package versions:');
  console.error(drift.join('\n'));
  console.error('Run `node scripts/sync-versions.mjs` to fix.');
  process.exit(1);
}

console.log(CHECK ? 'OK: version files in sync.' : 'Done.');
