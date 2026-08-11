#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Rejects `major` bumps in `.changeset/*.md`. While the SDK is pre-1.0, a breaking change rides the
// **minor** (`0.11.0 -> 0.12.0`) and `major` is reserved for the deliberate `1.0.0` cut — see
// `agents/instructions/changesets.md` and `.github/RELEASE-SPEC.md`. The stakes are asymmetric: the
// publish groups are `fixed`, so a single `major` anywhere versions all ~300 packages to `1.0.0` in one
// release, and the mistake is invisible until `changeset version` runs on `main`.
//
// A gate, not a reminder (unlike the advisory `check-changeset.mjs`).
//
// DELETE THIS SCRIPT and its `check` step in `.github/workflows/check.yml` as part of the PR that cuts
// `1.0.0` — that PR needs the very `major` this rejects, and past 1.0 `major` is simply how a breaking
// change is expressed.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGESET_DIR = join(ROOT, '.changeset');

// One anchor per publish group (the same package directories `sync-versions.mjs` stamps): once both have
// left `0.x` this check is obsolete rather than merely unused, so say so loudly instead of failing.
const GROUP_ANCHORS = [
  { group: 'A (core/SDK)', packageFile: join(ROOT, 'packages/sdk/client/package.json') },
  { group: 'B (plugins + cli)', packageFile: join(ROOT, 'packages/devtools/cli/package.json') },
];

// `'@dxos/react-ui-menu': major`, `"@dxos/x": major`, and the unquoted form. Package names contain no colon.
const BUMP_LINE = /^\s*(['"]?)(?<pkg>[^'":]+)\1\s*:\s*(['"]?)(?<bump>major|minor|patch)\3\s*$/;

const readVersion = (packageFile) => JSON.parse(readFileSync(packageFile, 'utf8')).version;

const preRelease = GROUP_ANCHORS.filter(({ packageFile }) => readVersion(packageFile).startsWith('0.'));
if (preRelease.length === 0) {
  const versions = GROUP_ANCHORS.map(({ group, packageFile }) => `${group} at ${readVersion(packageFile)}`);
  console.log(`Every publish group is past 0.x (${versions.join(', ')}) — delete this check.`);
  process.exit(0);
}

// Front matter is the block between the first two `---` fences; the body below it is prose.
const bumpsIn = (source) => {
  const lines = source.split('\n');
  const open = lines.findIndex((line) => line.trim() === '---');
  if (open === -1) {
    return [];
  }
  const close = lines.findIndex((line, index) => index > open && line.trim() === '---');
  return lines
    .slice(open + 1, close === -1 ? undefined : close)
    .map((line) => BUMP_LINE.exec(line)?.groups)
    .filter((groups) => groups?.bump === 'major')
    .map(({ pkg }) => pkg);
};

const violations = readdirSync(CHANGESET_DIR)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .flatMap((file) => bumpsIn(readFileSync(join(CHANGESET_DIR, file), 'utf8')).map((pkg) => ({ file, pkg })));

if (violations.length === 0) {
  process.exit(0);
}

const groups = preRelease.map(({ group, packageFile }) => `${group} at ${readVersion(packageFile)}`).join(', ');
console.error(`Found ${violations.length} \`major\` bump(s) in .changeset/ — not allowed while pre-1.0 (${groups}).`);
for (const { file, pkg } of violations) {
  console.error(`  .changeset/${file}: '${pkg}': major`);
}
console.error('');
console.error('Change these to `minor` — at 0.x a breaking change rides the minor, and `major` would cut 1.0.0');
console.error('across every package in the fixed group. Describe the break in the changeset body instead.');
console.error('See agents/instructions/changesets.md. Cutting 1.0.0 deliberately? Delete this check in that PR.');
process.exit(1);
