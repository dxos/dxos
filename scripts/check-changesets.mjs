#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// The gate on `.changeset/*.md` authoring: every rule that can fail a build, in one pass over the
// changesets so a run reports *all* of them rather than whichever the first step happened to hit.
//
//   parseable    Rejects a file `@changesets/parse` cannot read, so no later rule reasons about a
//                changeset whose releases it never saw.
//   bump levels  Rejects `major` while pre-1.0 — a breaking change rides the minor.
//   packages     Rejects a package Changesets cannot version: an `ignore`d one named alongside a
//                released one, or a name absent from the workspace.
//   count        Rejects a branch adding more than one changeset — a PR is one changelog entry.
//
// Every rule fails on something invisible until `changeset version` runs on `main`, where the cost is a
// dead `publish` job rather than a red PR. Advisory checks live elsewhere: `check-changeset.mjs` reminds
// a PR that it *has* no changeset and deliberately never fails, so it stays its own (non-gating) job.
// See `agents/instructions/changesets.md` and `.github/RELEASE-SPEC.md`.

import { parseChangesetFile } from '@changesets/parse';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGESET_DIR = join(ROOT, '.changeset');

const BASE = process.env.CHANGESET_BASE_REF || 'origin/main';

// `stderr: pipe` so git's own diagnostics land in the caught error rather than the build log.
const sh = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const lines = (output) => output.split('\n').filter(Boolean);

// A YAML comment, so `@changesets/parse` discards it rather than reading a package named `multiple-changesets`.
const WAIVER = /^\s*#\s*multiple-changesets\s*:\s*(?<reason>\S.*?)\s*$/;

// Only the exact README is not a changeset — `featureREADME.md` is one, and Changesets reads it as one.
const isChangeset = (file) => /^\.changeset\/[^/]+\.md$/.test(file) && file !== '.changeset/README.md';

const read = (file) => {
  try {
    return readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return '';
  }
};

// Front matter is the block between the first two `---` fences; a `#` below it is a markdown heading.
// Releases come from `parseChangesetFile`; this exists only for the count rule's waiver, which is a YAML
// comment the parser discards by design — precisely so it never reaches `CHANGELOG.md`.
const frontMatter = (source) => {
  const all = source.split('\n');
  const open = all.findIndex((line) => line.trim() === '---');
  if (open === -1) {
    return [];
  }
  const close = all.findIndex((line, index) => index > open && line.trim() === '---');
  return all.slice(open + 1, close === -1 ? undefined : close);
};

// The releases a changeset declares, read by the same parser the release itself uses, so this gate cannot
// disagree with `changeset version` about what a file says. A hand-rolled matcher silently missed the
// forms it did not anticipate — a `none` release, a YAML flow mapping — and a gate that sees no releases
// in a file it does not understand passes the very changeset it exists to reject.
//
// `@changesets/parse@1.0.0` exports no `safeParseChangesetFile`, so an unreadable file arrives as a throw;
// it becomes a reported failure rather than an empty release list.
const readChangeset = (file) => {
  try {
    const { releases } = parseChangesetFile(read(file));
    return { releases: releases.map(({ name, type }) => ({ pkg: name, bump: type })) };
  } catch (err) {
    return { releases: [], error: err.message.split('\n')[0] };
  }
};

const releasesIn = (file) => readChangeset(file).releases;

// Every changeset in the tree, for the rules that do not care how it got here.
const allChangesets = readdirSync(CHANGESET_DIR)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .map((file) => `.changeset/${file}`)
  .sort();

const failures = [];
const fail = (...block) => failures.push(block.join('\n'));

// ─── parseable ──────────────────────────────────────────────────────────────────────────────────────
// Runs first: every rule below reasons about the releases a changeset declares, so a file the parser
// cannot read would quietly satisfy all of them — and would fail the release instead.
const checkParseable = () => {
  for (const file of allChangesets) {
    const { error } = readChangeset(file);
    if (error) {
      fail(
        `${file} cannot be parsed as a changeset: ${error}`,
        "  Fix: a `---` fence, one `'<package>': <bump>` line per package (quote any `@`-scoped name —",
        '  YAML reserves a leading `@`), then a closing `---` and the changelog body.',
      );
    }
  }
};

// ─── bump levels ────────────────────────────────────────────────────────────────────────────────────
// DELETE THIS SECTION and its `GROUP_ANCHORS` as part of the PR that cuts `1.0.0` — that PR needs the
// very `major` this rejects, and past 1.0 `major` is simply how a breaking change is expressed. The rest
// of this script outlives 1.0.0 and must stay.
//
// One anchor per publish group (the same package directories `sync-versions.mjs` stamps): once both have
// left `0.x` the rule is obsolete rather than merely unused, so say so loudly instead of failing.
const GROUP_ANCHORS = [
  { group: 'A (core/SDK)', packageFile: 'packages/sdk/client/package.json' },
  { group: 'B (plugins + cli)', packageFile: 'packages/devtools/cli/package.json' },
];

const version = (packageFile) => JSON.parse(read(packageFile)).version;

const checkBumps = () => {
  const preRelease = GROUP_ANCHORS.filter(({ packageFile }) => version(packageFile).startsWith('0.'));
  if (preRelease.length === 0) {
    const versions = GROUP_ANCHORS.map(({ group, packageFile }) => `${group} at ${version(packageFile)}`);
    console.log(`Every publish group is past 0.x (${versions.join(', ')}) — delete the bump-level rule.`);
    return;
  }

  const violations = allChangesets.flatMap((file) =>
    releasesIn(file)
      .filter(({ bump }) => bump === 'major')
      .map(({ pkg }) => ({ file, pkg })),
  );
  if (violations.length === 0) {
    return;
  }

  const groups = preRelease.map(({ group, packageFile }) => `${group} at ${version(packageFile)}`).join(', ');
  fail(
    `Found ${violations.length} \`major\` bump(s) — not allowed while pre-1.0 (${groups}).`,
    ...violations.map(({ file, pkg }) => `  ${file}: '${pkg}': major`),
    '',
    '  Fix: write `minor` — at 0.x a breaking change rides the minor, and `major` would cut 1.0.0 across',
    '  every package in the fixed group. Describe the break in the changeset body instead.',
    '  Cutting 1.0.0 deliberately? Delete the bump-level rule in that PR.',
  );
};

// ─── packages ───────────────────────────────────────────────────────────────────────────────────────
// pnpm-workspace.yaml's `!` entries. A directory outside the workspace holds no versionable package, so
// a changeset naming one is as broken as a typo.
const OUTSIDE_WORKSPACE = [
  /^packages\/deprecated\//,
  /^packages\/sdk\/examples\/src\/template\//,
  /(^|\/)__fixtures__\//,
  /(^|\/)(build|dist|out)\//,
  /(^|\/)node_modules\//,
];

const checkPackages = () => {
  // `git ls-files` rather than a directory walk: it is the tracked tree, so an untracked scratch package
  // cannot widen the set and a stale `node_modules` cannot slow it down.
  const workspace = new Set(
    lines(sh('git ls-files --cached -- "package.json" "*/package.json"'))
      .filter((file) => !OUTSIDE_WORKSPACE.some((pattern) => pattern.test(file)))
      .map((file) => {
        try {
          return JSON.parse(read(file)).name;
        } catch {
          return undefined;
        }
      })
      .filter(Boolean),
  );

  const { ignore = [] } = JSON.parse(read('.changeset/config.json'));
  const ignored = new Set(ignore);

  for (const file of allChangesets) {
    const packages = releasesIn(file).map(({ pkg }) => pkg);

    const unknown = packages.filter((pkg) => !workspace.has(pkg) && !ignored.has(pkg));
    if (unknown.length > 0) {
      fail(
        `${file} names package(s) not in the workspace: ${unknown.join(', ')}.`,
        '  Fix: use the current package name, or add it to `ignore` in .changeset/config.json if it is',
        '  an app or a private tool.',
      );
    }

    // Changesets refuses to assemble a release plan from a changeset mixing the two, so the entry does
    // not merely get dropped — it takes the whole release with it.
    const ignoredNames = packages.filter((pkg) => ignored.has(pkg));
    const releasedNames = packages.filter((pkg) => !ignored.has(pkg));
    if (ignoredNames.length > 0 && releasedNames.length > 0) {
      fail(
        `${file} mixes ignored and released packages — Changesets cannot version it.`,
        `  ignored:  ${ignoredNames.join(', ')}`,
        `  released: ${releasedNames.join(', ')}`,
        '  Fix: delete the ignored line(s). Those packages deploy rather than publish, so they carry no',
        '  changelog and the entry describes the released packages either way.',
      );
    }
  }
};

// ─── count ──────────────────────────────────────────────────────────────────────────────────────────
// Diff-based, so it is meaningful only on a branch: `.changeset/` holds every unreleased entry on `main`,
// and a `merge_group` batches PRs that each legitimately carry their own. A local run has no event name
// and is the case this is most useful in, so absence means run.
const COUNTABLE_EVENT = !process.env.GITHUB_EVENT_NAME || process.env.GITHUB_EVENT_NAME === 'pull_request';

// The bump lines, so a failure shows what each entry claims and the author can see whether they are
// really unrelated.
const describe = (file) => {
  const bumps = releasesIn(file).map(({ pkg, bump }) => `${pkg}: ${bump}`);
  return bumps.length > 0 ? `${file} — ${bumps.join(', ')}` : file;
};

const waiverIn = (file) =>
  frontMatter(read(file))
    .map((line) => WAIVER.exec(line)?.groups?.reason)
    .find(Boolean);

const checkCount = () => {
  if (!COUNTABLE_EVENT) {
    console.log(`Skipping the count rule on \`${process.env.GITHUB_EVENT_NAME}\` — it is diff-based.`);
    return;
  }

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
    console.error(`Unable to compute the changeset diff (${err.message}); skipping the count rule.`);
    return;
  }

  if (added.length <= 1) {
    console.log(`OK: ${added.length} changeset(s) added on this branch.`);
    return;
  }

  const waived = added.map((file) => ({ file, reason: waiverIn(file) })).find(({ reason }) => reason);
  if (waived) {
    console.log(`OK: ${added.length} changesets added, waived by ${waived.file}: ${waived.reason}`);
    return;
  }

  fail(
    `Found ${added.length} changesets added on this branch — a PR is normally one changelog entry.`,
    ...added.map((file) => `  ${describe(file)}`),
    '',
    "  Fix: consolidate them into one file — one `'<package>': <bump>` line per publish group, one body.",
    '  Two groups, five commits, or a wide refactor are all still one entry.',
    '',
    '  Genuinely two unrelated things a reader would look up separately? Waive it with a YAML comment in',
    '  the front matter of one of them (the parser drops it, so it never reaches CHANGELOG.md):',
    '    # multiple-changesets: <why a reader would look these up separately>',
  );
};

checkParseable();
checkBumps();
checkPackages();
checkCount();

if (failures.length === 0) {
  process.exit(0);
}

for (const failure of failures) {
  console.error(failure);
  console.error('');
}
console.error('See agents/instructions/changesets.md.');
process.exit(1);
