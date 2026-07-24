#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Bootstrap-publish a single workspace package to npm. Intended for the FIRST publish of a new
// public package (e.g. a freshly-extracted leaf lib), after which CI's `check-packages-published`
// passes and release automation takes over. Builds the package, validates it is publishable, and
// runs `pnpm publish` (which rewrites `workspace:`/`catalog:` specifiers to concrete versions —
// npm would ship them verbatim), then opens the package's npm settings page (where trusted
// publishing is configured for future automated releases). Auth is the caller's responsibility
// (`npm login` or a scoped token in ~/.npmrc) — this script never handles credentials.
//
// Usage:
//   node scripts/publish-package.mjs <package-name|package-dir> [--dry-run] [--tag <tag>] [--no-build] [--no-open]
//
// Examples:
//   node scripts/publish-package.mjs @dxos/progress --dry-run
//   node scripts/publish-package.mjs @dxos/progress
//   node scripts/publish-package.mjs packages/core/compute/progress --tag next

import { globby } from 'globby';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const usage = () => {
  console.error(
    'Usage: node scripts/publish-package.mjs <package-name|package-dir> [--dry-run] [--tag <tag>] [--no-build] [--no-open]',
  );
  process.exit(2);
};

// Minimal flag parser: one positional (the package), plus the documented options.
const parseArgs = (argv) => {
  const options = { dryRun: false, tag: undefined, build: true, open: true };
  let target;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-build') {
      options.build = false;
    } else if (arg === '--no-open') {
      options.open = false;
    } else if (arg === '--tag') {
      options.tag = argv[++index];
      if (!options.tag) {
        usage();
      }
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      usage();
    } else if (target === undefined) {
      target = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      usage();
    }
  }
  if (!target) {
    usage();
  }
  return { target, ...options };
};

// Resolve a package name (e.g. `@dxos/progress`) or a directory to its package.json path.
const resolvePackageJson = async (target) => {
  const asDir = resolve(REPO_ROOT, target);
  if (existsSync(join(asDir, 'package.json'))) {
    return join(asDir, 'package.json');
  }
  const files = await globby(['{packages,tools,vendor}/**/package.json'], {
    cwd: REPO_ROOT,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'],
  });
  for (const file of files) {
    try {
      if (JSON.parse(readFileSync(file, 'utf8')).name === target) {
        return file;
      }
    } catch {
      // Skip unparseable manifests.
    }
  }
  console.error(`ERROR: could not find a workspace package named or located at '${target}'.`);
  process.exit(1);
};

const run = (command, args, cwd) => {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
};

// Prefer the repo-pinned moon (proto resolves the correct version); the bare `moon` on PATH may be
// a stale global that rejects this workspace's config.
const moonBin = () => {
  const local = join(REPO_ROOT, 'node_modules', '.bin', 'moon');
  return existsSync(local) ? local : 'moon';
};

// Open a URL in the default browser (best-effort — a failure here never fails the publish).
const openUrl = (url) => {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    execFileSync(opener, [url], { stdio: 'ignore' });
  } catch {
    // The URL is printed regardless, so the caller can open it by hand.
  }
};

const main = async () => {
  const { target, dryRun, tag, build, open } = parseArgs(process.argv.slice(2));
  const packageJsonPath = await resolvePackageJson(target);
  const packageDir = dirname(packageJsonPath);
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  console.log(`Package: ${pkg.name}@${pkg.version}`);
  console.log(`Dir:     ${packageDir}`);

  if (pkg.private) {
    console.error(
      `ERROR: ${pkg.name} is marked "private": true and cannot be published. Remove the flag once a ` +
        'trusted publisher exists (see AGENTS.md).',
    );
    process.exit(1);
  }
  const access = pkg.publishConfig?.access;
  if (pkg.name.startsWith('@') && access !== 'public') {
    console.error(
      `ERROR: scoped package ${pkg.name} needs "publishConfig.access": "public" (found: ${access ?? 'unset'}).`,
    );
    process.exit(1);
  }

  // Ensure npm auth before publishing (a dry run needs none). If not logged in, run `npm login`
  // interactively — npm opens its own browser flow; credentials never pass through this script.
  if (!dryRun) {
    const whoami = () => execFileSync('npm', ['whoami'], { encoding: 'utf8' }).trim();
    let user;
    try {
      user = whoami();
    } catch {
      console.log('\nNot authenticated to npm — starting `npm login` (browser flow).');
      console.log(`The account needs publish rights to the ${pkg.name.split('/')[0]} scope.\n`);
      try {
        execFileSync('npm', ['login'], { stdio: 'inherit' });
        user = whoami();
      } catch {
        console.error('ERROR: npm login did not complete; re-run this script once authenticated.');
        process.exit(1);
      }
    }
    console.log(`npm user: ${user}`);
  }

  if (build) {
    // The moon project id is the package directory's basename by convention.
    const projectId = packageDir.split('/').pop();
    run(moonBin(), ['run', `${projectId}:build`], REPO_ROOT);
  }

  // `pnpm publish` (not npm): it rewrites `workspace:`/`catalog:` protocol specifiers to concrete
  // versions at pack time — `npm publish` would ship them verbatim and produce an uninstallable
  // manifest for any package with in-repo dependencies. `--no-git-checks` because bootstrap
  // publishes legitimately run from feature branches.
  const publishArgs = ['publish', '--access', access ?? 'public', '--no-git-checks'];
  if (tag) {
    publishArgs.push('--tag', tag);
  }
  if (dryRun) {
    publishArgs.push('--dry-run');
  }
  run('pnpm', publishArgs, packageDir);

  // The npm package settings page is where trusted publishing (OIDC) is configured for future
  // automated releases — surface it (and open it) after the first real publish.
  const settingsUrl = `https://www.npmjs.com/package/${pkg.name}/access`;
  if (dryRun) {
    console.log('\nDry run complete — nothing was published.');
    console.log(`Publish for real with: node scripts/publish-package.mjs ${pkg.name}`);
  } else {
    console.log(`\nPublished ${pkg.name}@${pkg.version}.`);
    console.log('\nNext steps:');
    console.log(`  1. Configure trusted publishing (OIDC) so CI can release future versions:`);
    console.log(`     ${settingsUrl}`);
    console.log('     → Trusted Publisher → GitHub Actions → repo dxos/dxos, workflow publish-all.yml.');
    console.log(`  2. Verify the publish: npm view ${pkg.name} version`);
    console.log("  3. CI's check-packages-published now passes for this package; release automation");
    console.log('     takes over from the next changeset release.');
    if (open) {
      openUrl(settingsUrl);
    }
  }
};

await main();
