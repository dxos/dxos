#!/usr/bin/env bun

//
// Copyright 2025 DXOS.org
//

import { spawnSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Parse command line arguments.
const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const tag = tagIndex !== -1 && args[tagIndex + 1] ? args[tagIndex + 1] : 'latest';
const dryRun = args.includes('--dry-run');

console.log(`[Publish] Publishing cli packages with tag: ${tag}`);
if (dryRun) {
  console.log('[Publish] DRY RUN MODE - no actual publishing');
}

const distDir = 'dist';

if (!existsSync(distDir)) {
  console.error('[Publish] Error: dist directory not found. Run build first.');
  process.exit(1);
}

// Get all package directories.
const packageDirs = readdirSync(distDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('cli'))
  .map((dirent) => dirent.name);

if (packageDirs.length === 0) {
  console.error('[Publish] Error: no package directories found in dist/');
  process.exit(1);
}

// Separate main package from platform packages.
const mainPackage = packageDirs.find((dir) => dir === 'cli');
const platformPackages = packageDirs.filter((dir) => dir !== 'cli');

if (!mainPackage) {
  console.error('[Publish] Error: main package (cli) not found in dist/');
  process.exit(1);
}

const NPM_REGISTRY = 'https://registry.npmjs.org';

/** Whether npm already serves this exact version. */
async function isPublished(name: string, version: string): Promise<boolean> {
  const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`unexpected status ${response.status} querying ${name}`);
  }

  const body = (await response.json()) as { versions?: Record<string, unknown> };
  return Object.hasOwn(body.versions ?? {}, version);
}

// Helper function to publish a package.
function publishPackage(packageDir: string): boolean {
  const packagePath = join(distDir, packageDir);
  const packageJsonPath = join(packagePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    console.error(`[Publish] Error: package.json not found in ${packagePath}`);
    return false;
  }

  const packageJson = require(`../${packageJsonPath}`);
  if (published.has(`${packageJson.name}@${packageJson.version}`)) {
    console.log(`[Publish] ✓ ${packageJson.name}@${packageJson.version} already published`);
    return true;
  }

  console.log(`[Publish] Publishing ${packageJson.name}@${packageJson.version}...`);

  // npm, not pnpm: `pnpm publish` normalizes every file in the tarball to 0644, which strips the
  // executable bit off the platform binary and makes the installed CLI fail with EACCES.
  const publishArgs = ['publish', '--tag', tag];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }

  const result = spawnSync('npm', publishArgs, {
    cwd: packagePath,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[Publish] Failed to publish ${packageJson.name}`);
    return false;
  }

  console.log(`[Publish] ✓ ${packageJson.name}@${packageJson.version}`);
  return true;
}

// A release makes six publish calls, so one failing partway must not strand the launcher: skipping what
// already landed lets the run be retried.
const published = new Set<string>();
for (const packageDir of packageDirs) {
  const { name, version } = require(`../${join(distDir, packageDir, 'package.json')}`);
  if (await isPublished(name, version)) {
    published.add(`${name}@${version}`);
  }
}

// Publish platform packages first (main package depends on them).
console.log('[Publish] Publishing platform packages...');
let allSuccess = true;

for (const packageDir of platformPackages.sort()) {
  if (!publishPackage(packageDir)) {
    allSuccess = false;
    break;
  }
}

if (!allSuccess) {
  console.error('[Publish] Publishing failed.');
  process.exit(1);
}

// Publish main package last.
console.log('[Publish] Publishing main package...');
if (!publishPackage(mainPackage)) {
  console.error('[Publish] Publishing failed.');
  process.exit(1);
}

console.log('[Publish] All packages published successfully!');
