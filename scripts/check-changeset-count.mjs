#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Rejects a branch that adds more than one `.changeset/*.md`. A changeset is a changelog *entry*, so one
// PR is normally one entry however many packages, groups, or commits it touched — work spanning two
// groups is still one story with a line per group. A file per commit fragments the changelog into
// entries nobody can follow and re-reads as several releases' worth of change.
//
// A gate, not a reminder (unlike the advisory `check-changeset.mjs`): the multi-entry PR is real but
// rare, so it carries an explicit waiver instead of being tolerated by default — a YAML comment in the
// front matter of any added changeset,
//
//   # multiple-changesets: <why a reader would look these up separately>
//
// which the changeset parser drops, so the reason never reaches `CHANGELOG.md`.
//
// Counting is diff-based against the merge base: `.changeset/` accumulates every unreleased entry on
// `main` (dozens at a time), so the files present in the tree say nothing about what this branch added.
// See `agents/instructions/changesets.md`.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.env.CHANGESET_BASE_REF ?? 'origin/main';

// A YAML comment, so `@changesets/parse` discards it rather than reading a package named `multiple-changesets`.
const WAIVER = /^\s*#\s*multiple-changesets\s*:\s*(?<reason>\S.*?)\s*$/;

// `stderr: pipe` so git's own diagnostics land in the caught error rather than the build log.
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const lines = (output) => output.split('\n').filter(Boolean);

const isChangeset = (file) => /^\.changeset\/[^/]+\.md$/.test(file) && !file.endsWith('README.md');

// Front matter is the block between the first two `---` fences; a `#` below it is a markdown heading.
const frontMatter = (source) => {
  const all = source.split('\n');
  const open = all.findIndex((line) => line.trim() === '---');
  if (open === -1) {
    return [];
  }
  const close = all.findIndex((line, index) => index > open && line.trim() === '---');
  return all.slice(open + 1, close === -1 ? undefined : close);
};

const read = (file) => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

const waiverIn = (file) =>
  frontMatter(read(file))
    .map((line) => WAIVER.exec(line)?.groups?.reason)
    .find(Boolean);

// The bump lines, so a failure shows what each entry claims and the author can see whether they are really unrelated.
const describe = (file) => {
  const bumps = frontMatter(read(file))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  return bumps.length > 0 ? `${file} — ${bumps.join(', ')}` : file;
};

let base;
try {
  base = sh(`git merge-base ${BASE} HEAD`);
} catch {
  base = BASE;
}

let added;
try {
  added = Array.from(
    new Set([
      ...lines(sh(`git diff --name-only --diff-filter=A ${base} HEAD -- .changeset`)),
      // Staged and untracked additions too, so a local run catches this before the commit.
      ...lines(sh('git diff --name-only --diff-filter=A HEAD -- .changeset')),
      ...lines(sh('git ls-files --others --exclude-standard -- .changeset')),
    ]),
  )
    .filter(isChangeset)
    .sort();
} catch (err) {
  // Never hard-fail on a git error — an unresolvable base is not an authoring mistake.
  console.error(`check-changeset-count: unable to compute diff (${err.message}); skipping.`);
  process.exit(0);
}

if (added.length <= 1) {
  console.log(`OK: ${added.length} changeset(s) added on this branch.`);
  process.exit(0);
}

const waived = added.map((file) => ({ file, reason: waiverIn(file) })).find(({ reason }) => reason);
if (waived) {
  console.log(`OK: ${added.length} changesets added, waived by ${waived.file}: ${waived.reason}`);
  process.exit(0);
}

console.error(`Found ${added.length} changesets added on this branch — a PR is normally one changelog entry.`);
for (const file of added) {
  console.error(`  ${describe(file)}`);
}
console.error('');
console.error("Consolidate them into one file: one `'<package>': <bump>` line per publish group, one body.");
console.error('Two groups, five commits, or a wide refactor are all still one entry.');
console.error('');
console.error('Genuinely two unrelated things a reader would look up separately? Waive it with a YAML comment');
console.error('in the front matter of one of them (the parser drops it, so it never reaches CHANGELOG.md):');
console.error('  # multiple-changesets: <why a reader would look these up separately>');
console.error('See agents/instructions/changesets.md.');
process.exit(1);
