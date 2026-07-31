#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Detects whether a PR touching publishable source includes a `.changeset/*.md`. A file is ignored when
// it only touches private/app code, internal tooling, tests, stories, docs, or CI.
//
// Advisory only — never fails the build. On a pull request the `changeset-reminder` job reads its
// `missing` / `packages` outputs to post a sticky reminder comment when a changeset looks missing.
// A change that isn't changelog-relevant simply omits the changeset (no empty changeset is required) —
// the code still ships with the next release, just without a changelog entry.
// See `agents/instructions/changesets.md`.

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BASE = process.env.CHANGESET_BASE_REF ?? 'origin/main';

// Emit a step output for the reminder workflow; no-op when run locally.
const setOutput = (key, value) => {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    return;
  }
  const delimiter = `__EOF_${key}__`;
  appendFileSync(file, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
};

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// Resolve the merge-base so only this branch's changes are inspected.
let base;
try {
  base = sh(`git merge-base ${BASE} HEAD`);
} catch {
  base = BASE;
}

let changedFiles;
try {
  const committed = sh(`git diff --name-only ${base} HEAD`).split('\n');
  const working = sh('git diff --name-only HEAD').split('\n'); // include uncommitted (useful locally)
  changedFiles = Array.from(new Set([...committed, ...working].filter(Boolean)));
} catch (err) {
  // Never hard-fail on a git error.
  console.error(`check-changeset: unable to compute diff (${err.message}); skipping.`);
  setOutput('missing', 'false');
  process.exit(0);
}

const pkgCache = new Map();
const findPackage = (file) => {
  let dir = dirname(file);
  while (dir && dir !== '.' && dir !== '/') {
    const manifestPath = join(dir, 'package.json');
    if (existsSync(manifestPath)) {
      if (!pkgCache.has(manifestPath)) {
        try {
          pkgCache.set(manifestPath, JSON.parse(readFileSync(manifestPath, 'utf8')));
        } catch {
          pkgCache.set(manifestPath, null);
        }
      }
      return pkgCache.get(manifestPath);
    }
    dir = dirname(dir);
  }
  return null;
};

// A file is "publishable source" when it belongs to a non-private package and is not a test/story/doc.
const isPublishableSource = (file) => {
  if (!/^(packages|tools|vendor)\//.test(file)) {
    return false;
  }
  if (/\.(md|mdx)$/.test(file)) {
    return false;
  }
  if (/(^|\/)(test|tests|__tests__|__fixtures__|stories)\//.test(file)) {
    return false;
  }
  if (/\.(test|spec|stories)\.[cm]?[jt]sx?$/.test(file)) {
    return false;
  }
  const manifest = findPackage(file);
  // Private packages (apps + internal tooling) deploy or stay internal; they never publish.
  return Boolean(manifest?.name) && manifest.private !== true;
};

const touchedPublishable = changedFiles.filter(isPublishableSource);
const hasChangeset = changedFiles.some((file) => /^\.changeset\/.+\.md$/.test(file) && !file.endsWith('README.md'));

if (touchedPublishable.length === 0) {
  console.log('OK: no publishable source changed; changeset not required.');
  setOutput('missing', 'false');
  process.exit(0);
}

if (hasChangeset) {
  console.log(`OK: publishable source changed and a changeset is present (${touchedPublishable.length} file(s)).`);
  setOutput('missing', 'false');
  process.exit(0);
}

const affectedPackages = Array.from(new Set(touchedPublishable.map((file) => findPackage(file)?.name)))
  .filter(Boolean)
  .sort();

const message = [
  'Publishable source changed but no `.changeset/*.md` was found.',
  'Affected publishable packages:',
  ...affectedPackages.map((name) => `  - ${name}`),
  '',
  'If this is consumer-relevant (worth a changelog entry), add one:  pnpm changeset',
  "If it isn't changelog-relevant (chore/refactor), no action is needed.",
  'See agents/instructions/changesets.md.',
].join('\n');

console.warn(`NOTE (advisory): ${message}`);
setOutput('missing', 'true');
setOutput('packages', affectedPackages.join(', '));
process.exit(0);
