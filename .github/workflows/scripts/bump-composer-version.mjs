#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Bump the Composer desktop/extension version. composer-app + composer-crx share one version line; this
// bumps both in lockstep and prints the new version to stdout. Composer is not in Changesets — its version
// lives in these package.jsons and is advanced only by the production release (deploy-apps.yml `release`
// job), which runs this and then `scripts/sync-versions.mjs` to stamp the derived files (version.ts,
// tauri.conf.json).
//
// Deliberately uses plain arithmetic (no `semver` dependency): Composer's version is always a clean X.Y.Z,
// so this is identical to `semver.inc`, and it keeps the `release` job dependency-free (no pnpm install).
//
// Usage: bump-composer-version.mjs <patch|minor|major>   (default: patch)

import { readFileSync, writeFileSync } from 'node:fs';

const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`usage: bump-composer-version.mjs <patch|minor|major> (got: ${bump})`);
  process.exit(1);
}

const packages = ['packages/apps/composer-app/package.json', 'packages/apps/composer-crx/package.json'];

const current = JSON.parse(readFileSync(packages[0], 'utf8')).version;
const [major, minor, patch] = current.split('-')[0].split('.').map(Number);
const next =
  bump === 'major'
    ? `${major + 1}.0.0`
    : bump === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

for (const file of packages) {
  // Replace only the top-level "version" line, so the diff stays minimal (no full JSON re-serialization).
  writeFileSync(file, readFileSync(file, 'utf8').replace(/^(  "version": ")[^"]*(",)$/m, `$1${next}$2`));
}

process.stdout.write(next);
