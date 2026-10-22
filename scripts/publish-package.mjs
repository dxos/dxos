#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Bootstrap a single workspace package on npm so `publish-all.yml` can release it from then on.
// npm's OIDC trusted publisher can only be attached to a package that already exists on the
// registry, so a new package needs one manual publish followed by a trusted-publisher setup:
//   1. If the package is not on the registry yet: build it, stamp `version` to 0.0.0 (the
//      bootstrap slot — the real version is left for `publish-all.yml`), `pnpm publish`, restore
//      the version. `pnpm` (not npm) rewrites `workspace:`/`catalog:` specifiers to concrete versions.
//   2. With `--trust`: create the trusted publisher with `npm trust github` (npm >= 11.15). npm asks
//      for a browser 2FA confirmation, so run this in an interactive terminal. Without `--trust` the
//      script prints the manual settings and opens the package's npm access page.
// Already-published packages skip step 1, so re-running for a package that only lacks a trusted
// publisher is safe. Credentials stay with npm and never pass through this script, except with `--op`:
// it logs in as the npm-bot account from 1Password (`op` CLI) and answers every 2FA prompt with a fresh
// TOTP code, so the flow runs unattended; the session token lives in a temporary npmrc and is revoked on exit.
//
// Usage:
//   node scripts/publish-package.mjs <package-name|package-dir> [--trust] [--op] [--dry-run] [--no-build] [--no-open]
//
// Examples:
//   node scripts/publish-package.mjs @dxos/plugin-discord --dry-run
//   node scripts/publish-package.mjs @dxos/plugin-discord --trust
//   node scripts/publish-package.mjs @dxos/plugin-discord --trust --op
//   node scripts/publish-package.mjs packages/core/compute/progress

import { globby } from 'globby';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NPM_REGISTRY = 'https://registry.npmjs.org';
const BOOTSTRAP_VERSION = '0.0.0';

// The trusted publisher is bound to this repo and workflow filename (see publish-all.yml header).
const TRUST_REPOSITORY = 'dxos/dxos';
const TRUST_WORKFLOW = 'publish-all.yml';

// First npm release whose `trust github` accepts `--allow-publish` (11.10–11.14 have `trust` without it).
const NPM_TRUST_MIN_VERSION = [11, 15, 0];

// The npm-bot account (see the npm-publishing skill).
const OP_NPM_BOT = {
  username: 'op://eng-ops/com.npmjs/BOT_USERNAME',
  password: 'op://eng-ops/com.npmjs/BOT_PASSWORD',
  otp: 'op://eng-ops/com.npmjs/BOT_TOTP?attribute=otp',
};

const USAGE =
  'Usage: node scripts/publish-package.mjs <package-name|package-dir> [--trust] [--op] [--dry-run] [--no-build] [--no-open]';

const usage = () => {
  console.error(USAGE);
  process.exit(2);
};

const parseArgs = (argv) => {
  const options = { dryRun: false, build: true, open: true, trust: false, op: false };
  let target;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-build') {
      options.build = false;
    } else if (arg === '--no-open') {
      options.open = false;
    } else if (arg === '--trust') {
      options.trust = true;
    } else if (arg === '--op') {
      options.op = true;
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

const readPackageJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const writePackageJson = (file, pkg) => writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);

// Set by `--op`: child processes read the temporary npmrc, and `otpArgs()` supplies each 2FA code.
let session;

// npm reads config env vars case-insensitively, so an inherited `NPM_CONFIG_USERCONFIG` would shadow ours.
const sessionEnv = () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_config_userconfig'),
  );
  return { ...env, npm_config_userconfig: session.userconfig };
};

// The OTP value is redacted from the echoed command line.
const run = (command, args, cwd = REPO_ROOT) => {
  const shown = args.map((arg) => (arg.startsWith('--otp=') ? '--otp=******' : arg));
  console.log(`$ ${command} ${shown.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit', env: session ? sessionEnv() : process.env });
};

const opRead = (reference) =>
  execFileSync('op', ['read', '--no-newline', reference], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

// A TOTP code lasts 30 seconds, so each command that needs one reads it fresh; `npm trust` parses only
// the `--otp=<code>` form (a separate value is taken as a positional argument).
const otpArgs = () => (session ? [`--otp=${opRead(OP_NPM_BOT.otp)}`] : []);

// Logs in as npm-bot through the registry's legacy login endpoint, which takes the OTP as a header.
const startOpSession = async () => {
  const name = opRead(OP_NPM_BOT.username);
  const response = await fetch(`${NPM_REGISTRY}/-/user/org.couchdb.user:${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'npm-otp': opRead(OP_NPM_BOT.otp) },
    body: JSON.stringify({
      _id: `org.couchdb.user:${name}`,
      name,
      password: opRead(OP_NPM_BOT.password),
      type: 'user',
      roles: [],
      date: new Date().toISOString(),
    }),
  });
  const { token } = await response.json().catch(() => ({}));
  if (!response.ok || !token) {
    throw new Error(`npm login as ${name} failed (status ${response.status})`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'npm-bot-'));
  const userconfig = join(dir, '.npmrc');
  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${token}\n`, { mode: 0o600 });
  session = { dir, token, userconfig };
  console.log(`npm user: ${name} (1Password)`);
};

// Revokes the session token so it does not outlive the run.
const endOpSession = async () => {
  if (!session) {
    return;
  }
  const { dir, token } = session;
  session = undefined;
  try {
    const response = await fetch(`${NPM_REGISTRY}/-/user/token/${token}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    }).catch((error) => ({ ok: false, status: error.message }));
    if (!response.ok) {
      console.warn(
        `WARNING: revoking the npm session token failed (status ${response.status}); revoke it on npmjs.com.`,
      );
    } else {
      console.log('npm session token revoked.');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// Prefer the repo-pinned moon; the bare `moon` on PATH may be a stale global that rejects this workspace's config.
const moonBin = () => {
  const local = join(REPO_ROOT, 'node_modules', '.bin', 'moon');
  return existsSync(local) ? local : 'moon';
};

// A moon.yml `id:` overrides the directory-name default (e.g. vendor/quickjs → vendor-quickjs).
const moonProjectId = (packageDir) => {
  const moonFile = join(packageDir, 'moon.yml');
  const match = existsSync(moonFile) ? readFileSync(moonFile, 'utf8').match(/^id:\s*['"]?([^'"\s]+)/m) : null;
  return match?.[1] ?? packageDir.split('/').pop();
};

// True when the package name exists on the registry at any version.
const isOnRegistry = async (name) => {
  const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`unexpected status ${response.status} querying ${name} on the npm registry`);
  }
  return true;
};

const npmUser = () => {
  try {
    return execFileSync('npm', ['whoami'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

// Ensure an npm session, starting the interactive `npm login` browser flow when there is none.
const ensureNpmAuth = (scope) => {
  let user = npmUser();
  if (!user) {
    console.log('\nNot authenticated to npm — starting `npm login` (browser flow).');
    console.log(`The account needs publish rights to the ${scope} scope.\n`);
    try {
      execFileSync('npm', ['login'], { stdio: 'inherit' });
    } catch {
      // Reported below.
    }
    user = npmUser();
    if (!user) {
      console.error('ERROR: npm login did not complete; re-run this script once authenticated.');
      process.exit(1);
    }
  }
  console.log(`npm user: ${user}`);
};

const isAtLeast = (version, minimum) => {
  const parts = version.split('.').map(Number);
  for (let index = 0; index < minimum.length; index++) {
    if ((parts[index] ?? 0) !== minimum[index]) {
      return (parts[index] ?? 0) > minimum[index];
    }
  }
  return true;
};

// The local npm when it already has `trust`, otherwise a pinned npm 11 through npx.
const npmTrustCommand = () => {
  const local = execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  return isAtLeast(local, NPM_TRUST_MIN_VERSION)
    ? { command: 'npm', prefix: [] }
    : { command: 'npx', prefix: ['--yes', `npm@${NPM_TRUST_MIN_VERSION.join('.')}`] };
};

const configureTrust = (name, dryRun) => {
  const { command, prefix } = npmTrustCommand();
  const args = [
    ...prefix,
    'trust',
    'github',
    name,
    '--repository',
    TRUST_REPOSITORY,
    '--file',
    TRUST_WORKFLOW,
    '--allow-publish',
    '--yes',
    // npm's spinner otherwise hides the 2FA URL and its ENTER prompt.
    '--no-progress',
  ];
  // Printed rather than run with npm's own --dry-run, which still demands a 2FA confirmation.
  if (dryRun) {
    console.log(`\nWould run: ${command} ${args.join(' ')}`);
    return;
  }
  if (!session) {
    console.log('\nnpm prints a URL and waits ~5 minutes: press ENTER (or open the URL) and approve in the browser.');
  }
  run(command, [...args, ...otpArgs()]);
};

const printManualTrust = (name, settingsUrl) => {
  console.log('\nConfigure trusted publishing (OIDC) so publish-all.yml can release future versions:');
  console.log(`  ${settingsUrl}`);
  console.log('  → Trusted Publisher → GitHub Actions:');
  console.log(`      Repository:      ${TRUST_REPOSITORY}`);
  console.log(`      Workflow file:   ${TRUST_WORKFLOW}`);
  console.log('      Environment:     (leave blank)');
  console.log('      Allowed actions: npm publish only (not stage publish)');
  console.log(`  Or automate it: node scripts/publish-package.mjs ${name} --trust`);
};

// Opens a URL in the default browser; best-effort because the URL is also printed.
const openUrl = (url) => {
  const [opener, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  try {
    execFileSync(opener, args, { stdio: 'ignore' });
  } catch {
    // Printed above.
  }
};

const bootstrapPublish = ({ packageJsonPath, packageDir, pkg, access, dryRun, build }) => {
  if (build) {
    run(moonBin(), ['run', `${moonProjectId(packageDir)}:build`]);
  }

  const original = readPackageJson(packageJsonPath);
  writePackageJson(packageJsonPath, { ...original, version: BOOTSTRAP_VERSION });
  try {
    // `--no-git-checks`: bootstrap publishes legitimately run from feature branches.
    const args = ['publish', '--access', access, '--no-git-checks'];
    if (dryRun) {
      args.push('--dry-run');
    } else {
      args.push(...otpArgs());
    }
    run('pnpm', args, packageDir);
  } finally {
    writePackageJson(packageJsonPath, original);
    console.log(`Restored ${pkg.name} version to ${original.version}.`);
  }
};

const main = async () => {
  const { target, dryRun, build, open, trust, op } = parseArgs(process.argv.slice(2));
  const packageJsonPath = await resolvePackageJson(target);
  const packageDir = dirname(packageJsonPath);
  const pkg = readPackageJson(packageJsonPath);

  console.log(`Package: ${pkg.name}@${pkg.version}`);
  console.log(`Dir:     ${packageDir}`);

  if (pkg.private) {
    console.error(
      `ERROR: ${pkg.name} is marked "private": true and cannot be published. Remove the flag first ` +
        '(see AGENTS.md "New packages are private").',
    );
    process.exit(1);
  }
  const access = pkg.publishConfig?.access ?? 'public';
  if (pkg.name.startsWith('@') && pkg.publishConfig?.access !== 'public') {
    console.error(
      `ERROR: scoped package ${pkg.name} needs "publishConfig.access": "public" ` +
        `(found: ${pkg.publishConfig?.access ?? 'unset'}).`,
    );
    process.exit(1);
  }

  const published = await isOnRegistry(pkg.name);
  console.log(`Registry: ${published ? 'already published' : 'not published'}`);

  if (!dryRun && (!published || trust)) {
    if (op) {
      await startOpSession();
    } else {
      ensureNpmAuth(pkg.name.split('/')[0]);
    }
  }

  if (published) {
    console.log(`Skipping bootstrap publish: ${pkg.name} is already on npm.`);
  } else {
    bootstrapPublish({ packageJsonPath, packageDir, pkg, access, dryRun, build });
    if (!dryRun) {
      console.log(`\nPublished ${pkg.name}@${BOOTSTRAP_VERSION}.`);
    }
  }

  const settingsUrl = `https://www.npmjs.com/package/${pkg.name}/access`;
  if (trust) {
    configureTrust(pkg.name, dryRun);
    if (!dryRun) {
      console.log(`\nTrusted publisher configured: ${TRUST_REPOSITORY} → ${TRUST_WORKFLOW}.`);
      console.log(`Verify: ${settingsUrl}`);
    }
  } else {
    printManualTrust(pkg.name, settingsUrl);
    if (open && !dryRun) {
      openUrl(settingsUrl);
    }
  }

  if (dryRun) {
    console.log('\nDry run complete — nothing was published or configured.');
  } else {
    console.log('\npublish-all.yml releases future versions from the next changeset release.');
  }
};

try {
  await main();
} catch (error) {
  console.error(`ERROR: ${error.cause?.message ?? error.message}`);
  process.exitCode = 1;
} finally {
  await endOpSession();
}
