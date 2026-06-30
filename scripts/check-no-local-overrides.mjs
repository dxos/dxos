#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Cross-repo Tier-3 guard: rejects committed local-link artifacts. `link-packages.mjs` (Tier 3) writes
// `file:` entries / a `.local-pack/` directory into `pnpm.overrides` for editing two repos at once; those
// must never be committed (re-pin to a published or pkg.pr.new version first). See
// `agents/instructions/cross-repo-development.md`. Run in CI in every repo that consumes another's packages.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

// A dependency/override VALUE (not a package name) is a local-link artifact when it uses the file:
// protocol or points at the .local-pack staging directory.
const isLocalLink = (value) => typeof value === 'string' && (value.startsWith('file:') || value.includes('.local-pack'));

const violations = [];

const scanRecord = (record, label) => {
  for (const [name, value] of Object.entries(record ?? {})) {
    if (isLocalLink(value)) {
      violations.push(`  ${label}: "${name}": "${value}"`);
    }
  }
};

// pnpm-workspace.yaml: overrides + catalog(s).
const workspaceFile = `${ROOT}/pnpm-workspace.yaml`;
if (existsSync(workspaceFile)) {
  const workspace = yaml.load(readFileSync(workspaceFile, 'utf8')) ?? {};
  scanRecord(workspace.overrides, 'pnpm-workspace.yaml overrides');
  scanRecord(workspace.catalog, 'pnpm-workspace.yaml catalog');
  for (const [catalogName, entries] of Object.entries(workspace.catalogs ?? {})) {
    scanRecord(entries, `pnpm-workspace.yaml catalogs.${catalogName}`);
  }
}

// Every package.json: dependency maps + pnpm.overrides + resolutions.
const tracked = execSync('git ls-files "*package.json"', { encoding: 'utf8', cwd: ROOT })
  .split('\n')
  .filter(Boolean);
for (const relativePath of tracked) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(`${ROOT}/${relativePath}`, 'utf8'));
  } catch {
    continue;
  }
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'resolutions']) {
    scanRecord(manifest[field], `${relativePath} ${field}`);
  }
  scanRecord(manifest.pnpm?.overrides, `${relativePath} pnpm.overrides`);
}

if (violations.length > 0) {
  console.error('ERROR: committed local-link (Tier-3) overrides found — these must never be committed.');
  console.error('Re-pin to a published npm version or a pkg.pr.new URL before committing.');
  console.error('See agents/instructions/cross-repo-development.md.\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('OK: no committed file:/.local-pack overrides.');
