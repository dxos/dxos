#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Push/pull development fixtures (e.g. a real mailbox archive exported from the stories-inbox
// ArchiveModule) through a private R2 bucket, encrypted client-side.
//
// These fixtures keep their PII: they are real inboxes, captured to develop and debug the mail
// pipelines against realistic data. Two independent controls keep them contained:
//
//  1. The bucket is private and reachable only through `wrangler`, so access is Cloudflare account
//     membership — there is no HTTP endpoint to misconfigure, and no token to leak into a browser.
//  2. Every object is encrypted with `age` BEFORE it leaves the machine, under the pushing user's
//     OWN key, so bucket read access alone does not yield a readable inbox — and one developer's
//     archives stay unreadable to everyone else, including whoever administers the bucket.
//
// The recipient is derived from the identity (`age-keygen -y`) rather than configured separately, so
// push and pull are symmetric by construction: you cannot encrypt an archive you cannot decrypt.
// Sharing is deliberate and per-object — `push --recipient <age1...>` encrypts to someone else's
// public key — never a standing default.
//
// A fixture is identified by NAME (e.g. `inbox`), which makes both the remote key and the local path
// deterministic: `mailbox/<user>/<name>.json.age` remotely, `testing/fixtures/<name>.json` locally.
// That is what lets `pull <name>` work without an object listing — wrangler's R2 surface is
// get/put/delete only. Overwriting a name is intended; R2 object versioning keeps the history.
//
// CI never has either credential, so `pull` cannot succeed there; fixture-backed tests stay gated on
// the file's presence and skip. That is an absence of capability rather than a policy.
//
// Setup (once per developer):
//   age-keygen -o ~/.config/dxos/fixtures.key     # then store it in 1Password
//   export DX_FIXTURES_AGE_KEY=~/.config/dxos/fixtures.key
//
// Usage:
//   moon run fixtures:push -- <file> --name <name> [--recipient <age1...>]
//   moon run fixtures:pull -- <name> [--user <user>]
//   moon run fixtures:list          # local fixtures (the remote has no listing API)
//
// Environment:
//   DX_FIXTURES_AGE_KEY   Path to your age identity file. May be an `op://` reference.
//   DX_FIXTURES_BUCKET    Overrides the bucket name (default `test-fixtures`).
//   DX_FIXTURES_DIR       Overrides the local directory (default `<repo>/testing/fixtures`).
//   CLOUDFLARE_ACCOUNT_ID Required by wrangler when the token spans several accounts.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BUCKET = process.env.DX_FIXTURES_BUCKET ?? 'test-fixtures';

// One shared, git-ignored directory at the repo root: every package's tests resolve a fixture by
// name from here (see `tools/fixtures/src`), so a corpus pulled once serves the whole monorepo.
const FIXTURES_DIR = process.env.DX_FIXTURES_DIR ?? join(REPO_ROOT, 'testing/fixtures');

// A name is a path segment, not a path: it is interpolated into both an R2 key and a local filename.
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const main = () => {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'push':
      return push(rest);
    case 'pull':
      return pull(rest);
    case 'list':
      return list();
    default:
      usage(`Unknown command: ${command ?? '(none)'}`);
  }
};

const push = (args) => {
  const { positional, flags } = parseArgs(args);
  const file = positional[0];
  if (!file) {
    usage('push requires a file.');
  }
  const source = resolve(file);
  if (!existsSync(source)) {
    fail(`No such file: ${source}`);
  }

  // Default the name from the filename so a push is never silently anonymous.
  const name = validName(flags.name ?? basename(source).replace(/\.json$/, ''));

  // Sanity-check the payload before it becomes an opaque blob: an archive is a JSON array of
  // serialized messages, and pushing the wrong file is only discoverable after a pull otherwise.
  const messages = readArchive(source);
  requireBinary('age', 'brew install age');

  // Default to our own public key so a push is always reversible by the pusher; an explicit
  // `--recipient` is the deliberate act of handing one archive to someone else.
  const recipient = flags.recipient ?? ownRecipient();
  if (flags.recipient) {
    console.warn(`Encrypting for ${flags.recipient} — you will NOT be able to decrypt this archive.\n`);
  }

  const key = remoteKey(name, userInfo().username);
  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  try {
    execFileSync('age', ['-r', recipient, '-o', encrypted, source], { stdio: 'inherit' });
    wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', encrypted, '--remote']);
  } finally {
    rmSync(encrypted, { force: true });
  }

  console.log(`\nPushed ${messages} messages (${size(source)}) → ${key}`);
  console.log(`Pull elsewhere with:  moon run fixtures:pull -- ${name}`);
};

const pull = (args) => {
  const { positional, flags } = parseArgs(args);
  if (!positional[0]) {
    usage('pull requires a fixture name (e.g. `inbox`).');
  }
  const name = validName(positional[0]);
  const owner = flags.user ?? userInfo().username;

  requireBinary('age', 'brew install age');
  const identity = identityFile();

  const out = join(FIXTURES_DIR, `${name}.json`);
  mkdirSync(dirname(out), { recursive: true });

  const key = remoteKey(name, owner);
  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  try {
    wrangler(['r2', 'object', 'get', `${BUCKET}/${key}`, '--file', encrypted, '--remote']);
    execFileSync('age', ['-d', '-i', identity, '-o', out, encrypted], { stdio: 'inherit' });
  } finally {
    rmSync(encrypted, { force: true });
  }

  const messages = readArchive(out);
  console.log(`\nPulled ${messages} messages (${size(out)}) → ${out}`);
  console.log(`Tests resolve it by name: fixturePath('${name}').`);
};

/**
 * Local fixtures only. The remote has no listing API — wrangler's R2 surface is get/put/delete —
 * and adding one would need a second credential (the S3 API); browse the Cloudflare dashboard.
 */
const list = () => {
  const entries = existsSync(FIXTURES_DIR) ? readdirSync(FIXTURES_DIR).filter((entry) => entry.endsWith('.json')) : [];
  if (entries.length === 0) {
    console.log(`No fixtures in ${FIXTURES_DIR}. Pull one: moon run fixtures:pull -- <name>`);
    return;
  }
  for (const entry of entries) {
    const path = join(FIXTURES_DIR, entry);
    console.log(`${entry.replace(/\.json$/, '').padEnd(24)} ${size(path).padStart(10)}  ${path}`);
  }
};

/** Remote key for a named fixture. Deterministic, so `pull <name>` needs no object listing. */
const remoteKey = (name, owner) => `mailbox/${owner}/${name}.json.age`;

const validName = (name) => {
  if (!NAME_RE.test(name)) {
    fail(`Invalid fixture name: "${name}". Use lowercase letters, digits and dashes (e.g. \`inbox\`).`);
  }
  return name;
};

/**
 * Our own age public key, derived from the identity file rather than configured separately: one
 * secret to manage, and push/pull cannot drift apart into an archive nobody can open.
 */
const ownRecipient = () => execFileSync('age-keygen', ['-y', identityFile()], { encoding: 'utf8' }).trim();

/** Path to the age identity file, resolving an `op://` reference to a temporary file. */
const identityFile = () => {
  const configured = process.env.DX_FIXTURES_AGE_KEY;
  if (!configured) {
    fail('DX_FIXTURES_AGE_KEY is required. Create one: age-keygen -o ~/.config/dxos/fixtures.key');
  }
  if (!configured.startsWith('op://')) {
    const path = resolve(configured.replace(/^~(?=\/)/, homedir()));
    if (!existsSync(path)) {
      fail(`No age identity at ${path}. Create one: age-keygen -o ${path}`);
    }
    return path;
  }

  // A 1Password-held identity is materialized for the life of the process only: `age` takes a file,
  // and leaving the key on disk afterwards would defeat storing it in a vault.
  requireBinary('op', 'brew install 1password-cli');
  const contents = execFileSync('op', ['read', configured], { encoding: 'utf8' });
  const path = join(mkdtempSync(join(tmpdir(), 'dxos-age-')), 'identity');
  writeFileSync(path, contents, { mode: 0o600 });
  temporaryIdentities.push(dirname(path));
  return path;
};

const temporaryIdentities = [];

process.on('exit', () => temporaryIdentities.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Validates the archive shape and returns its message count. */
const readArchive = (file) => {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Not valid JSON: ${file} (${error.message})`);
  }
  if (!Array.isArray(parsed)) {
    fail(`Expected an array of serialized messages: ${file}`);
  }
  return parsed.length;
};

/**
 * Runs the repo-pinned wrangler via `pnpm exec` rather than whatever is on PATH: a globally
 * installed (or 1Password-plugin-aliased) wrangler can be old enough to reject flags this script
 * relies on, and the failure surfaces as an opaque "Unknown argument".
 */
const wrangler = (args) => {
  try {
    return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'inherit',
    });
  } catch (error) {
    // wrangler's own diagnosis is already on stderr (`stdio: 'inherit'`), so this only adds the
    // causes it cannot know about — asserting a cause here would misattribute e.g. a missing key.
    fail(
      `wrangler ${args.slice(0, 3).join(' ')} failed (see above). If it is an auth error, run ` +
        '`pnpm 1p-credentials` (or `wrangler login`) and set CLOUDFLARE_ACCOUNT_ID when your token ' +
        'spans several accounts.',
    );
    throw error;
  }
};

const requireBinary = (name, hint) => {
  try {
    execFileSync('which', [name], { stdio: 'ignore' });
  } catch {
    fail(`\`${name}\` not found. Install it: ${hint}`);
  }
};

const parseArgs = (args) => {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = args[++index];
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
};

const size = (file) => `${(statSync(file).size / 1024).toFixed(0)} KB`;

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const usage = (message) => {
  console.error(`${message}\n`);
  console.error('Usage:');
  console.error('  moon run fixtures:push -- <file> --name <name> [--recipient <age1...>]');
  console.error('  moon run fixtures:pull -- <name> [--user <user>]');
  console.error('  moon run fixtures:list');
  process.exit(1);
};

main();
