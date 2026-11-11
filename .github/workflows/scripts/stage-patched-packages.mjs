#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Copies the patched installs of third-party packages out of node_modules so pkg-pr-new can publish
// them beside the @dxos packages. pnpm's `patchedDependencies` apply only inside this workspace, so a
// published @dxos package would otherwise install the stock release. pkg-pr-new rewrites a dependency
// to the pkg.pr.new URL of any package in the same publish run, so the @dxos packages pick these up.
//
// Usage: stage-patched-packages.mjs <out-dir> <package-name>...
// Prints the staged directories, one per line.

import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, ...names] = process.argv.slice(2);
if (!outDir || names.length === 0) {
  console.error('Usage: stage-patched-packages.mjs <out-dir> <package-name>...');
  process.exit(1);
}

const workspace = readFileSync('pnpm-workspace.yaml', 'utf-8');
const store = 'node_modules/.pnpm';

for (const name of names) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const version = workspace.match(new RegExp(`^\\s+'?${escaped}@([^':]+)'?:\\s*patches/`, 'm'))?.[1];
  if (!version) {
    throw new Error(`${name} has no entry in patchedDependencies`);
  }

  const prefix = `${name.replace('/', '+')}@${version}_patch_hash=`;
  const [entry, ...others] = readdirSync(store).filter((dir) => dir.startsWith(prefix));
  if (!entry || others.length > 0) {
    throw new Error(
      `Expected one patched install of ${name}@${version} in ${store}, found ${others.length + (entry ? 1 : 0)}`,
    );
  }

  // pnpm links a package's own dependencies as its siblings, so their versions are the ones this
  // workspace resolved, overrides included, rather than the ranges the upstream manifest declares.
  const siblings = join(store, entry, 'node_modules');
  const source = join(siblings, name);
  const target = join(outDir, name.replace('/', '__'));
  cpSync(source, target, { recursive: true, filter: (path) => !path.startsWith(join(source, 'node_modules')) });

  const manifestPath = join(target, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    const resolved = join(siblings, dependency, 'package.json');
    if (existsSync(resolved)) {
      manifest.dependencies[dependency] = JSON.parse(readFileSync(resolved, 'utf-8')).version;
    }
  }
  // pnpm pack runs lifecycle scripts, and these build from sources the install does not include.
  delete manifest.scripts;
  delete manifest.devDependencies;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(target);
}
