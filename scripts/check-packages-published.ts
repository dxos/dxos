#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Fails when a publishable workspace package has never been published to npm.
//
// `publish-all.yml` publishes through npm trusted publishing (OIDC), which npm can only attach to a
// package that already exists on the registry. A never-published package therefore fails with
// ENEEDAUTH mid-publish, after the others have shipped, leaving a partial release. The publish job
// runs this first so the run stops before building anything.
//
// Usage: bun scripts/check-packages-published.ts

import { readFile } from 'node:fs/promises';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const CONCURRENCY = 16;
const RETRIES = 2;

const PATTERNS = ['{packages,tools,vendor}/**/package.json', 'docs/package.json'];
const IGNORED = /(^|\/)(node_modules|__fixtures__|dist|build|out)\//;

type PublicPackage = { name: string; file: string };

const findPublicPackages = async (): Promise<PublicPackage[]> => {
  const packages: PublicPackage[] = [];
  for (const pattern of PATTERNS) {
    for await (const file of new Bun.Glob(pattern).scan({ onlyFiles: true })) {
      if (IGNORED.test(file)) {
        continue;
      }

      let manifest: { name?: string; private?: boolean };
      try {
        manifest = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        // Fixture and template manifests need not be valid JSON; none of them is published.
        continue;
      }

      if (manifest.name && !manifest.private) {
        packages.push({ name: manifest.name, file });
      }
    }
  }

  return packages;
};

// npm exposes no public API for whether a trusted publisher is configured, so "has been published" stands
// in for it: the bootstrap script (`scripts/publish-package.mjs`) publishes and configures one together.
const isPublished = async (name: string): Promise<boolean> => {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(name)}`;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.status === 404) {
      return false;
    }
    if (response.ok) {
      return true;
    }
    if (attempt >= RETRIES) {
      throw new Error(`unexpected status ${response.status} fetching ${url}`);
    }
  }
};

const packages = await findPublicPackages();
const unpublished: PublicPackage[] = [];
let cursor = 0;
const worker = async () => {
  while (cursor < packages.length) {
    const entry = packages[cursor++];
    if (!(await isPublished(entry.name))) {
      unpublished.push(entry);
    }
  }
};

try {
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
} catch (error) {
  console.error(`ERROR: failed to query the npm registry: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (unpublished.length > 0) {
  console.error('ERROR: these publishable packages have never been published to npm, so CI cannot publish them:');
  console.error('');
  for (const { name, file } of unpublished.sort((a, b) => a.name.localeCompare(b.name))) {
    console.error(`  ${name} (${file})`);
  }
  console.error('');
  console.error(
    'Bootstrap each one (`node scripts/publish-package.mjs <name> --trust`, see the npm-publishing skill),',
  );
  console.error('or mark it `"private": true` until it is ready.');
  process.exit(1);
}

console.log(`OK: all ${packages.length} publishable packages are published to npm.`);
