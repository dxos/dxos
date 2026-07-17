#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Bootstrap-publish every workspace package that fails `check-packages-published` (the CI
// published-package gate). Follows REPOSITORY_GUIDE.md "New npm packages":
//   - publish at 0.0.0 for the initial registry slot
//   - restore each package's monorepo version afterward
//   - remind to configure npm trusted publishing (OIDC) for publish-all.yml
//
// Auth is the caller's responsibility (`pnpm login` / scoped token in ~/.npmrc).
//
// Usage:
//   node scripts/publish-unpublished-packages.mjs [--dry-run] [--list] [--no-build] [--yes] [package...]
//
// Examples:
//   node scripts/publish-unpublished-packages.mjs --list
//   node scripts/publish-unpublished-packages.mjs --dry-run
//   node scripts/publish-unpublished-packages.mjs --yes
//   node scripts/publish-unpublished-packages.mjs @dxos/halo @dxos/halo-react

import { globby } from 'globby';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NPM_REGISTRY = 'https://registry.npmjs.org';
const BOOTSTRAP_VERSION = '0.0.0';
const CONCURRENCY = 10;
const RETRIES = 2;

const usage = () => {
  console.error(
    'Usage: node scripts/publish-unpublished-packages.mjs [--dry-run] [--list] [--no-build] [--yes] [package...]',
  );
  process.exit(2);
};

const parseArgs = (argv) => {
  const options = { dryRun: false, list: false, build: true, yes: false, filters: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--no-build') {
      options.build = false;
    } else if (arg === '--yes') {
      options.yes = true;
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      usage();
    } else {
      options.filters.push(arg);
    }
  }
  return options;
};

const moonBin = () => {
  const local = join(REPO_ROOT, 'node_modules', '.bin', 'moon');
  return existsSync(local) ? local : 'moon';
};

const run = (command, args, cwd = REPO_ROOT) => {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
};

const readPackageJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const writePackageJson = (file, pkg) => {
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
};

const collectPublishablePackages = async () => {
  const files = await globby(['{packages,tools,vendor}/**/package.json', 'docs/package.json'], {
    cwd: REPO_ROOT,
    ignore: ['**/node_modules/**', '**/__fixtures__/**', '**/dist/**', '**/build/**', '**/out/**'],
    absolute: true,
  });

  const packages = [];
  for (const file of files) {
    let pkg;
    try {
      pkg = readPackageJson(file);
    } catch {
      continue;
    }
    if (!pkg.name || pkg.private) {
      continue;
    }
    packages.push({
      file,
      dir: dirname(file),
      name: pkg.name,
      pkg,
    });
  }
  return packages;
};

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

const queryPublished = async (packages) => {
  const results = new Array(packages.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < packages.length) {
      const index = cursor++;
      const entry = packages[index];
      results[index] = { ...entry, published: await fetchPublished(entry.name) };
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
};

const workspaceDependencyNames = (pkg) => {
  const names = new Set();
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[section];
    if (!deps) {
      continue;
    }
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        names.add(name);
      }
    }
  }
  return names;
};

const validatePublishable = (entry) => {
  const access = entry.pkg.publishConfig?.access;
  if (entry.name.startsWith('@') && access !== 'public') {
    throw new Error(
      `${entry.name} needs "publishConfig.access": "public" (found: ${access ?? 'unset'}) in ${entry.file}`,
    );
  }
};

const expandSelection = (unpublished, filters) => {
  if (filters.length === 0) {
    return unpublished;
  }

  const byName = new Map(unpublished.map((entry) => [entry.name, entry]));
  const selected = new Map();

  const addWithDependencies = (name) => {
    const entry = byName.get(name);
    if (!entry || selected.has(name)) {
      return;
    }
    selected.set(name, entry);
    for (const dep of workspaceDependencyNames(entry.pkg)) {
      if (byName.has(dep)) {
        addWithDependencies(dep);
      }
    }
  };

  for (const filter of filters) {
    const entry = byName.get(filter);
    if (!entry) {
      console.error(`ERROR: '${filter}' is not an unpublished publishable package.`);
      console.error('Run with --list to see candidates.');
      process.exit(1);
    }
    addWithDependencies(filter);
  }

  return [...selected.values()];
};

const sortForPublish = (packages) => {
  const names = new Set(packages.map((entry) => entry.name));
  const indegree = new Map(packages.map((entry) => [entry.name, 0]));
  const dependents = new Map(packages.map((entry) => [entry.name, []]));

  for (const entry of packages) {
    for (const dep of workspaceDependencyNames(entry.pkg)) {
      if (!names.has(dep)) {
        continue;
      }
      indegree.set(entry.name, (indegree.get(entry.name) ?? 0) + 1);
      dependents.get(dep).push(entry.name);
    }
  }

  const queue = packages
    .map((entry) => entry.name)
    .filter((name) => (indegree.get(name) ?? 0) === 0)
    .sort();
  const ordered = [];

  while (queue.length > 0) {
    const name = queue.shift();
    ordered.push(packages.find((entry) => entry.name === name));
    for (const dependent of dependents.get(name) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }

  if (ordered.length !== packages.length) {
    const remaining = packages
      .map((entry) => entry.name)
      .filter((name) => !ordered.some((entry) => entry.name === name));
    throw new Error(`cycle among unpublished workspace dependencies: ${remaining.join(', ')}`);
  }

  return ordered;
};

const confirmPublish = async (packages) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('Packages to bootstrap-publish at 0.0.0:');
    for (const entry of packages) {
      console.log(`  ${entry.name}@${BOOTSTRAP_VERSION} (restore ${entry.pkg.version} afterward)`);
    }
    const answer = await rl.question('Continue? [y/N] ');
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
};

const stampBootstrapVersions = (packages) => {
  const originals = new Map();
  for (const entry of packages) {
    const pkg = readPackageJson(entry.file);
    originals.set(entry.file, pkg.version);
    pkg.version = BOOTSTRAP_VERSION;
    writePackageJson(entry.file, pkg);
    entry.pkg = pkg;
  }
  return originals;
};

const restoreVersions = (originals) => {
  for (const [file, version] of originals) {
    const pkg = readPackageJson(file);
    pkg.version = version;
    writePackageJson(file, pkg);
  }
};

const publishPackage = async (entry, { dryRun, build }) => {
  validatePublishable(entry);

  const access = entry.pkg.publishConfig?.access ?? 'public';
  if (build) {
    const projectId = entry.dir.split('/').pop();
    run(moonBin(), ['run', `${projectId}:build`]);
  }

  const publishArgs = ['publish', '--access', access, '--no-git-checks'];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }
  run('pnpm', publishArgs, entry.dir);
};

const printTrustedPublishingReminder = (packages) => {
  console.log('\nConfigure npm trusted publishing (OIDC) for each package:');
  console.log('  Repository: dxos/dxos');
  console.log('  Workflow file: publish-all.yml');
  console.log('  Environment: (leave blank)');
  console.log('  Allowed actions: npm publish only');
  console.log('');
  for (const entry of packages) {
    console.log(`  ${entry.name}: https://www.npmjs.com/package/${entry.name}/access`);
  }
  console.log('\nSee REPOSITORY_GUIDE.md "New npm packages" for details.');
};

const main = async () => {
  const { dryRun, list, build, yes, filters } = parseArgs(process.argv.slice(2));

  const publishable = await collectPublishablePackages();
  let queried;
  try {
    queried = await queryPublished(publishable);
  } catch (error) {
    const detail = error.cause?.message ?? error.message;
    console.error(`ERROR: failed to query the npm registry: ${detail}`);
    process.exit(1);
  }
  const unpublished = queried.filter((entry) => !entry.published).sort((left, right) => left.name.localeCompare(right.name));

  if (unpublished.length === 0) {
    console.log('OK: all publishable packages are already on npm.');
    return;
  }

  const selected = sortForPublish(expandSelection(unpublished, filters));

  if (list) {
    console.log('Unpublished publishable packages:');
    for (const entry of selected) {
      console.log(`  ${entry.name} (${entry.file})`);
    }
    return;
  }

  if (!dryRun) {
    try {
      const whoami = execFileSync('pnpm', ['whoami'], { encoding: 'utf8' }).trim();
      console.log(`pnpm user: ${whoami}`);
    } catch {
      console.error('ERROR: not authenticated to npm. Run `pnpm login` (needs publish rights to the package scope).');
      process.exit(1);
    }
  }

  if (!dryRun && !yes) {
    const confirmed = await confirmPublish(selected);
    if (!confirmed) {
      console.log('Aborted.');
      return;
    }
  }

  const originals = stampBootstrapVersions(selected);
  const published = [];

  try {
    for (const entry of selected) {
      console.log(`\n=== ${entry.name}@${BOOTSTRAP_VERSION} ===`);
      await publishPackage(entry, { dryRun, build });
      published.push(entry);
    }
  } finally {
    restoreVersions(originals);
    console.log('\nRestored monorepo versions in package.json.');
  }

  if (dryRun) {
    console.log('\nDry run complete — nothing was published.');
    return;
  }

  console.log(`\nPublished ${published.length} package(s) at ${BOOTSTRAP_VERSION}.`);
  printTrustedPublishingReminder(published);
};

try {
  await main();
} catch (error) {
  const detail = error.cause?.message ?? error.message;
  console.error(`ERROR: ${detail}`);
  process.exit(1);
}
