#!/usr/bin/env node

import { readFileSync } from 'fs';
import { globby } from 'globby';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const CONCURRENCY = 10;
const RETRIES = 2;

const files = await globby(['{packages,tools,vendor}/**/package.json', 'docs/package.json'], {
  ignore: ['**/node_modules/**', '**/__fixtures__/**', '**/dist/**', '**/build/**', '**/out/**'],
});

const publicPackages = [];

for (const file of files) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }

  if (!pkg.name || pkg.private) {
    continue;
  }

  publicPackages.push({ file, name: pkg.name });
}

// npm does not expose whether trusted publishing (OIDC) is configured for a package through any
// public API — that setting only lives in npmjs.com's UI. We can only check whether a package has
// ever been published. Per repo policy (see AGENTS.md), new packages stay `private: true` until
// their first publish, at which point trusted publishing is set up alongside it — so "published"
// is treated here as a stand-in for "trusted publishing is configured".
const fetchPublished = async (name) => {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(name)}`;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.npm.install-v1+json' } });
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

const results = new Array(publicPackages.length);
let cursor = 0;

const worker = async () => {
  while (cursor < publicPackages.length) {
    const index = cursor++;
    const entry = publicPackages[index];
    results[index] = { ...entry, published: await fetchPublished(entry.name) };
  }
};

try {
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
} catch (error) {
  console.error(`ERROR: failed to query the npm registry: ${error.message}`);
  process.exit(1);
}

const unpublished = results.filter((entry) => !entry.published);

if (unpublished.length > 0) {
  console.error('ERROR: The following publishable packages have never been published to npm.');
  console.error('Publish them and set up npm trusted publishing (OIDC) for each package.');
  console.error('');
  for (const { name, file } of unpublished.sort((a, b) => a.name.localeCompare(b.name))) {
    console.error(`  ${name} (${file})`);
  }
  process.exit(1);
}

console.log(`OK: all ${publicPackages.length} publishable packages are published to npm.`);
