#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Creates one annotated git tag and one GitHub Release per Changesets `fixed` group, replacing the
// per-package tag+release fan-out that `changesets/action` performs. Both groups are lockstep, so every
// member's tag named the identical commit — one tag per group is the same information in 2 refs instead of
// ~300, and GitHub's ref backend rejected roughly half of those ~300 single-ref pushes with
// `remote: fatal error in commit_refs`.
//
// Tag lines: Group A (core/SDK) is `v<version>`, continuing the pre-Changesets `v0.10.0` series; Group B
// (plugins + CLI) is `plugins-v<version>` on its own independent line.
//
// Release bodies are assembled from the member packages' `CHANGELOG.md` `## <version>` sections, deduped by
// changeset commit so each entry appears once per group rather than once per package that recorded it.
//
// Usage:
//   node scripts/release-groups.mjs               # tag + push + create releases (CI)
//   node scripts/release-groups.mjs --dry-run     # print tags and bodies, write nothing
//   node scripts/release-groups.mjs --ref <sha>   # tag a commit other than HEAD (backfill)
//   node scripts/release-groups.mjs --no-release  # tag and push only, skip the GitHub API

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DRY_RUN = process.argv.includes('--dry-run');
const NO_RELEASE = process.argv.includes('--no-release');
const REF = argValue('--ref') ?? 'HEAD';

const REPO = process.env.GITHUB_REPOSITORY ?? 'dxos/dxos';
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

// GitHub rejects a release body over 125,000 characters; truncate below that rather than lose the release.
const MAX_BODY = 120_000;

const BUMP_ORDER = ['patch', 'minor', 'major'];

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
}

/**
 * Group A holds core/SDK, Group B every `@dxos/plugin-*` plus `@dxos/cli` — identified by membership rather
 * than by position, so a regenerated `.changeset/config.json` cannot silently swap the two tag lines.
 */
const labelGroup = (members) =>
  members.includes('@dxos/cli')
    ? { id: 'plugins', title: 'Plugins + CLI', tagPrefix: 'plugins-v' }
    : { id: 'core', title: 'Core/SDK', tagPrefix: 'v' };

/** Every workspace `package.json`, keyed by package name. */
function readWorkspacePackages() {
  const packages = new Map();
  for (const file of git('ls-files', '*package.json').split('\n')) {
    if (!file || file.includes('node_modules')) {
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
    } catch {
      continue; // Malformed fixtures are not release members.
    }
    if (manifest.name) {
      packages.set(manifest.name, { version: manifest.version, dir: join(ROOT, dirname(file)) });
    }
  }
  return packages;
}

/**
 * Splits a `CHANGELOG.md` `## <version>` section into its changeset entries. An entry is a `- <sha>: <text>`
 * block plus any indented continuation; `- Updated dependencies` and bare `- @dxos/pkg@version` blocks are
 * dependency bookkeeping that every member repeats, so they are dropped.
 */
function parseChangelog(text, version) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) {
    return [];
  }

  const entries = [];
  let bump = 'patch';
  let block = null;

  const flush = () => {
    if (!block) {
      return;
    }
    const body = block.lines.join('\n').replace(/\s+$/, '');
    entries.push({ sha: block.sha, bump: block.bump, body });
    block = null;
  };

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('## ')) {
      break;
    }

    const heading = /^### (Major|Minor|Patch) Changes\s*$/.exec(line);
    if (heading) {
      flush();
      bump = heading[1].toLowerCase();
      continue;
    }

    if (line.startsWith('- ')) {
      flush();
      const entry = /^- ([0-9a-f]{7,40}): (.*)$/.exec(line);
      if (entry) {
        block = { sha: entry[1], bump, lines: [`- ${entry[2]}`] };
      }
      continue; // A non-changeset bullet ends the previous block without starting one.
    }

    block?.lines.push(line);
  }
  flush();

  return entries;
}

/** Highest `v`-prefixed tag on this group's line below `version`, for the release's compare link. */
function previousTag(tagPrefix, version) {
  const candidates = git('tag', '-l', `${tagPrefix}*`)
    .split('\n')
    .filter(Boolean)
    .map((tag) => ({ tag, parts: tag.slice(tagPrefix.length).split('.').map(Number) }))
    .filter(({ parts }) => parts.length === 3 && parts.every((part) => Number.isInteger(part)));

  const current = version.split('.').map(Number);
  const compare = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

  return candidates
    .filter(({ parts }) => compare(parts, current) < 0)
    .sort((left, right) => compare(left.parts, right.parts))
    .at(-1)?.tag;
}

function buildBody({ group, version, tag, members, packages, date }) {
  const entries = new Map();
  for (const name of members) {
    const changelog = join(packages.get(name).dir, 'CHANGELOG.md');
    if (!existsSync(changelog)) {
      continue;
    }
    for (const entry of parseChangelog(readFileSync(changelog, 'utf8'), version)) {
      // The same changeset lands in every member's changelog; keep one copy at its highest bump level.
      const existing = entries.get(entry.sha);
      if (!existing || BUMP_ORDER.indexOf(entry.bump) > BUMP_ORDER.indexOf(existing.bump)) {
        entries.set(entry.sha, entry);
      }
    }
  }

  const previous = previousTag(group.tagPrefix, version);
  const heading = previous
    ? `## [${group.title} ${version}](https://github.com/${REPO}/compare/${previous}...${tag}) (${date})`
    : `## ${group.title} ${version} (${date})`;

  const sections = [heading, ''];
  for (const bump of ['major', 'minor', 'patch']) {
    const matching = [...entries.values()].filter((entry) => entry.bump === bump);
    if (!matching.length) {
      continue;
    }
    sections.push(`### ${bump[0].toUpperCase()}${bump.slice(1)} Changes`, '');
    for (const entry of matching) {
      sections.push(`${entry.body} ([${entry.sha}](https://github.com/${REPO}/commit/${entry.sha}))`, '');
    }
  }

  if (entries.size === 0) {
    sections.push('_No changeset entries recorded for this release._', '');
  }

  const manifest = members.map((name) => `${name}@${packages.get(name).version}`).join('\n');
  sections.push(
    `<details><summary>${members.length} packages in this release</summary>`,
    '',
    '```',
    manifest,
    '```',
    '',
    '</details>',
  );

  const body = sections.join('\n');
  if (body.length <= MAX_BODY) {
    return body;
  }
  const notice = `\n\n_Changelog truncated — see the [full diff](https://github.com/${REPO}/compare/${previous ?? tag}...${tag})._`;
  return body.slice(0, MAX_BODY - notice.length) + notice;
}

async function api(method, path, body) {
  if (!TOKEN) {
    throw new Error('GITHUB_TOKEN (or GH_TOKEN) is required to create releases; pass --no-release to skip');
  }
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/** Re-runs after a partial failure must converge, so an existing release is updated rather than duplicated. */
async function upsertRelease({ tag, body }) {
  const existing = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (existing.ok) {
    const { id } = await existing.json();
    await api('PATCH', `/repos/${REPO}/releases/${id}`, { name: tag, body });
    console.log(`Updated release ${tag}`);
    return;
  }
  await api('POST', `/repos/${REPO}/releases`, { tag_name: tag, name: tag, body });
  console.log(`Created release ${tag}`);
}

function pushTags(tags) {
  // One push carrying both refs: the per-ref push loop this replaces is what GitHub's backend rejected.
  const remote = process.env.GH_TOKEN ? `https://x-access-token:${process.env.GH_TOKEN}@github.com/${REPO}` : 'origin';
  const refs = tags.map((tag) => `refs/tags/${tag}`);
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync('git', ['push', remote, ...refs], { cwd: ROOT, stdio: 'inherit' });
      return;
    } catch (err) {
      if (attempt >= 3) {
        throw err;
      }
      console.warn(`Tag push failed (attempt ${attempt}); retrying...`);
      execFileSync('sleep', [String(2 ** attempt)]);
    }
  }
}

const config = JSON.parse(readFileSync(join(ROOT, '.changeset/config.json'), 'utf8'));
const packages = readWorkspacePackages();
const sha = git('rev-parse', REF);
const date = git('show', '-s', '--format=%cs', sha);

const releases = [];
for (const members of config.fixed ?? []) {
  const group = labelGroup(members);
  const versions = new Set(members.map((name) => packages.get(name)?.version).filter(Boolean));
  if (versions.size !== 1) {
    throw new Error(`Group ${group.id} is not in lockstep: found versions ${[...versions].join(', ')}`);
  }
  const version = [...versions][0];
  const tag = `${group.tagPrefix}${version}`;
  releases.push({ group, version, tag, body: buildBody({ group, version, tag, members, packages, date }) });
}

if (releases.length !== 2 || new Set(releases.map(({ group }) => group.id)).size !== 2) {
  throw new Error(`Expected one core and one plugins group, got: ${releases.map(({ tag }) => tag).join(', ')}`);
}

if (DRY_RUN) {
  for (const { tag, body } of releases) {
    console.log(`\n${'='.repeat(80)}\n${tag} at ${sha} (${body.length} chars)\n${'='.repeat(80)}\n${body}`);
  }
  process.exit(0);
}

try {
  const created = [];
  for (const { tag } of releases) {
    if (git('tag', '-l', tag)) {
      console.log(`Tag ${tag} already exists locally; leaving it as-is`);
      continue;
    }
    git('tag', '-a', tag, '-m', tag, sha);
    created.push(tag);
  }
  if (created.length) {
    pushTags(created);
  }

  if (!NO_RELEASE) {
    for (const { tag, body } of releases) {
      await upsertRelease({ tag, body });
    }
  }
} catch (err) {
  console.error(`::error::release-groups failed: ${err.message}`);
  process.exit(1);
}
