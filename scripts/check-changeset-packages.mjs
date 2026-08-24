#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Rejects a `.changeset/*.md` whose front matter names a package Changesets cannot version:
//
//   1. A changeset mixing an `ignore`d package with a released one. Changesets refuses to assemble a
//      release plan from it at all ("Mixed changesets that contain both ignored and not ignored packages
//      are not allowed"), so the entry does not merely get dropped — it takes the whole release with it.
//   2. A package name absent from the workspace, usually a rename or a typo. Assembly throws on the
//      first one it reaches.
//
// A gate, not a reminder (unlike the advisory `check-changeset.mjs`). Both faults are invisible until
// `changeset version` runs on `main`, where the failure is a dead `publish` job rather than a red PR —
// the same asymmetry that justifies `check-changeset-bumps.mjs`.
//
// An `ignore`d package is an app or a private tool: it deploys, it is never published, and it has no
// changelog, so naming it in a changeset buys nothing. Drop the line and keep the released packages.
// See `agents/instructions/changesets.md`.

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGESET_DIR = join(ROOT, '.changeset');

// The same shape `check-changeset-bumps.mjs` reads: package names contain no colon, and the trailing
// group matches a YAML line comment, which would otherwise smuggle a release past this.
const RELEASE_LINE = /^\s*(['"]?)(?<pkg>[^'":]+)\1\s*:\s*(['"]?)(?<bump>major|minor|patch)\3\s*(#.*)?$/;

// pnpm-workspace.yaml's `!` entries. A directory outside the workspace holds no versionable package, so
// a changeset naming one is as broken as a typo.
const OUTSIDE_WORKSPACE = [
  /^packages\/deprecated\//,
  /^packages\/sdk\/examples\/src\/template\//,
  /(^|\/)__fixtures__\//,
  /(^|\/)(build|dist|out)\//,
  /(^|\/)node_modules\//,
];

// Front matter is the block between the first two `---` fences; the body below it is prose.
const releasesIn = (source) => {
  const lines = source.split('\n');
  const open = lines.findIndex((line) => line.trim() === '---');
  if (open === -1) {
    return [];
  }
  const close = lines.findIndex((line, index) => index > open && line.trim() === '---');
  return lines
    .slice(open + 1, close === -1 ? undefined : close)
    .map((line) => RELEASE_LINE.exec(line)?.groups?.pkg)
    .filter(Boolean);
};

// `git ls-files` rather than a directory walk: it is the tracked tree, so an untracked scratch package
// cannot widen the set and a stale `node_modules` cannot slow it down.
const workspacePackages = new Set(
  execSync('git ls-files --cached -- "package.json" "*/package.json"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file && !OUTSIDE_WORKSPACE.some((pattern) => pattern.test(file)))
    .map((file) => {
      try {
        return JSON.parse(readFileSync(join(ROOT, file), 'utf8')).name;
      } catch {
        return undefined;
      }
    })
    .filter(Boolean),
);

const { ignore = [] } = JSON.parse(readFileSync(join(CHANGESET_DIR, 'config.json'), 'utf8'));
const ignored = new Set(ignore);

const mixed = [];
const unknown = [];
for (const file of readdirSync(CHANGESET_DIR).filter((file) => file.endsWith('.md') && file !== 'README.md')) {
  const releases = releasesIn(readFileSync(join(CHANGESET_DIR, file), 'utf8'));
  const missing = releases.filter((pkg) => !workspacePackages.has(pkg) && !ignored.has(pkg));
  if (missing.length > 0) {
    unknown.push({ file, packages: missing });
  }

  const ignoredReleases = releases.filter((pkg) => ignored.has(pkg));
  const releasedReleases = releases.filter((pkg) => !ignored.has(pkg));
  if (ignoredReleases.length > 0 && releasedReleases.length > 0) {
    mixed.push({ file, ignored: ignoredReleases, released: releasedReleases });
  }
}

if (mixed.length === 0 && unknown.length === 0) {
  process.exit(0);
}

for (const { file, ignored: ignoredReleases, released } of mixed) {
  console.error(`.changeset/${file} mixes ignored and released packages — Changesets cannot version it.`);
  console.error(`  ignored:  ${ignoredReleases.join(', ')}`);
  console.error(`  released: ${released.join(', ')}`);
  console.error('  Fix: delete the ignored line(s). Those packages deploy rather than publish, so they');
  console.error('  carry no changelog and the entry describes the released packages either way.');
  console.error('');
}

for (const { file, packages } of unknown) {
  console.error(`.changeset/${file} names package(s) not in the workspace: ${packages.join(', ')}.`);
  console.error('  Fix: use the current package name, or add it to `ignore` in .changeset/config.json if');
  console.error('  it is an app or a private tool.');
  console.error('');
}

console.error('See agents/instructions/changesets.md.');
process.exit(1);
