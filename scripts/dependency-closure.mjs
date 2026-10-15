#!/usr/bin/env node

// Writes `<project>/node_modules/.dependency-closure`, which every moon task lists as an input
// (`.moon/tasks/all.yml`): a hash of every third-party package the project's code and tools can load,
// and of what each of those resolves its own dependencies to, so a dependency change reruns the tasks
// it can reach. Runs from the root `prepare` script, which every `pnpm install` and `pnpm add` in the
// workspace runs.
//
// A project's closure follows its workspace links (their dependencies are loaded through it) and
// includes the closure of every project in TOOLCHAIN. Anything the lockfile holds that this cannot
// follow is an error: a weaker key would pass from the cache.
//
// `--print <project>` writes nothing and prints exactly the text hashed for that project, e.g. to diff two
// checkouts.

import { load } from 'js-yaml';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

// Loaded by path rather than through a dependency: the root holds the tools every task runs (vitest,
// tsc, oxlint) and the shared configs, and every `.storybook/main.mts` imports one of the Storybook configs.
const TOOLCHAIN = ['.', 'tools/storybook-lit', 'tools/storybook-react'];

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

const lockfile = load(readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf8'));
if (lockfile.lockfileVersion !== '9.0') {
  throw new Error(`Unsupported lockfileVersion ${lockfile.lockfileVersion}: update ${import.meta.filename}.`);
}
const { importers, packages, snapshots } = lockfile;

// Snapshot keys are `name@version(peers)`; an aliased dependency's version is already a key.
const snapshotKey = (name, version) => {
  const key = snapshots[`${name}@${version}`] ? `${name}@${version}` : version;
  if (!snapshots[key]) {
    throw new Error(`No snapshot for ${name}@${version}.`);
  }
  return key;
};

const closure = (projects) => {
  const keys = new Set();
  const visited = new Set();
  const pending = [];
  const visitProject = (project) => {
    if (visited.has(project)) {
      return;
    }
    if (!importers[project]) {
      throw new Error(`${project} is not a workspace project.`);
    }
    visited.add(project);
    for (const section of SECTIONS) {
      for (const [name, { version }] of Object.entries(importers[project][section] ?? {})) {
        if (version.startsWith('link:')) {
          visitProject(posix.join(project, version.slice('link:'.length)));
        } else {
          pending.push(snapshotKey(name, version));
        }
      }
    }
  };

  projects.forEach(visitProject);
  while (pending.length > 0) {
    const key = pending.pop();
    if (keys.has(key)) {
      continue;
    }
    keys.add(key);
    const { dependencies, optionalDependencies } = snapshots[key];
    for (const [name, version] of Object.entries({ ...dependencies, ...optionalDependencies })) {
      pending.push(snapshotKey(name, version));
    }
  }

  return keys;
};

// The resolution carries the integrity, so a republished version changes the hash too; the dependencies
// catch a package re-pointed to another version the closure already holds.
const describe = (key) => {
  const resolution = packages[key.replace(/\(.*$/, '')]?.resolution;
  if (!resolution) {
    throw new Error(`No resolution for ${key}.`);
  }
  const { dependencies, optionalDependencies } = snapshots[key];
  const edges = Object.entries({ ...dependencies, ...optionalDependencies }).sort(([a], [b]) => (a < b ? -1 : 1));
  return `${key} ${JSON.stringify(resolution)} ${JSON.stringify(edges)}`;
};

const toolchain = closure(TOOLCHAIN);
const fingerprint = (project) =>
  [
    JSON.stringify(lockfile.settings ?? {}),
    ...[...new Set([...closure([project]), ...toolchain])].sort().map(describe),
  ].join('\n');

const args = process.argv.slice(2);
if (args.length === 2 && args[0] === '--print') {
  process.stdout.write(fingerprint(args[1]));
} else if (args.length > 0) {
  throw new Error(`Usage: node ${import.meta.filename} [--print <project>]`);
} else {
  // Computed before any write, so an error leaves every file as the last install wrote it.
  const hashes = Object.keys(importers)
    .filter((project) => project !== '.')
    .map((project) => [project, createHash('sha256').update(fingerprint(project)).digest('hex')]);
  for (const [project, hash] of hashes) {
    const dir = join(ROOT, project, 'node_modules');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.dependency-closure'), `${hash}\n`);
  }
}
