#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Deletes the per-package GitHub Releases and git tags (`@dxos/pkg@<version>`) that `changesets/action`
// created before releases moved to one-per-group (`release-groups.mjs`). Group tags — `v<version>` and
// `plugins-v<version>` — are never matched, so a pruned version keeps its group releases.
//
// Releases are deleted before their tags: a release whose tag is already gone still renders, pointing at a
// ref that no longer resolves.
//
// Requires a token with `contents: write` on the repo — locally, `GH_TOKEN=$(gh auth token)`.
//
// Usage:
//   node scripts/prune-package-releases.mjs --version 0.11.0         # dry run: list what would go
//   node scripts/prune-package-releases.mjs --version 0.11.0 --yes   # delete

const REPO = process.env.GITHUB_REPOSITORY ?? 'dxos/dxos';
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

const CONFIRMED = process.argv.includes('--yes');
const VERSION = argValue('--version');

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
}

if (!VERSION) {
  console.error('Usage: prune-package-releases.mjs --version <x.y.z> [--yes]');
  process.exit(1);
}
if (!TOKEN) {
  console.error('GITHUB_TOKEN or GH_TOKEN is required (locally: GH_TOKEN=$(gh auth token))');
  process.exit(1);
}

// Scoped package tags only — `v0.11.0` and `plugins-v0.11.0` must survive the prune.
const PACKAGE_TAG = new RegExp(`^@[^@/]+/[^@]+@${VERSION.replace(/\./g, '\\.')}$`);

async function api(method, path, { paginate = false } = {}) {
  const results = [];
  for (let page = 1; ; page++) {
    const url = `https://api.github.com${path}${paginate ? `${path.includes('?') ? '&' : '?'}per_page=100&page=${page}` : ''}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
    }
    if (!paginate) {
      return response.status === 204 ? undefined : response.json();
    }
    const batch = await response.json();
    results.push(...batch);
    if (batch.length < 100) {
      return results;
    }
  }
}

try {
  const releases = (await api('GET', `/repos/${REPO}/releases`, { paginate: true })).filter(({ tag_name }) =>
    PACKAGE_TAG.test(tag_name),
  );
  const tags = (await api('GET', `/repos/${REPO}/git/matching-refs/tags/`, { paginate: true }))
    .map(({ ref }) => ref.replace(/^refs\/tags\//, ''))
    .filter((tag) => PACKAGE_TAG.test(tag));

  console.log(`${releases.length} per-package releases and ${tags.length} tags match @<scope>/<pkg>@${VERSION}`);
  if (!releases.length && !tags.length) {
    process.exit(0);
  }

  if (!CONFIRMED) {
    for (const { tag_name } of releases) {
      console.log(`  release ${tag_name}`);
    }
    for (const tag of tags) {
      console.log(`  tag     ${tag}`);
    }
    console.log('\nDry run — re-run with --yes to delete.');
    process.exit(0);
  }

  for (const { id, tag_name } of releases) {
    await api('DELETE', `/repos/${REPO}/releases/${id}`);
    console.log(`Deleted release ${tag_name}`);
  }
  for (const tag of tags) {
    await api('DELETE', `/repos/${REPO}/git/refs/tags/${tag}`);
    console.log(`Deleted tag ${tag}`);
  }
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
