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
//     membership - there is no HTTP endpoint to misconfigure, and no token to leak into a browser.
//  2. Every object is encrypted with `age` BEFORE it leaves the machine, under the pushing user's
//     OWN key, so bucket read access alone does not yield a readable inbox - and one developer's
//     archives stay unreadable to everyone else, including whoever administers the bucket.
//
// The recipient is derived from the identity (`age-keygen -y`) rather than configured separately, so
// push and pull are symmetric by construction: you cannot encrypt an archive you cannot decrypt.
// Sharing is deliberate and per-object - `push --recipient <age1...>` encrypts to someone else's
// public key - never a standing default.
//
// A fixture is identified by NAME (e.g. `inbox`) and a UTC VERSION stamp, so every push is a new
// object and history accumulates: `mailbox/<user>/<name>-<version>.json.age` remotely,
// `testing/fixtures/<name>-<version>.json` locally. Nothing can enumerate that history - wrangler's
// R2 surface is get/put/delete only - so each push also writes `mailbox/<user>/<name>.latest`, a few
// bytes naming the newest version. `pull <name>` follows the pointer; `pull <name> --at <version>`
// pins one. Readers resolve the newest LOCAL version by name (see `tools/fixtures/src`).
//
// CI never has either credential, so `pull` cannot succeed there; fixture-backed tests stay gated on
// the file's presence and skip. That is an absence of capability rather than a policy.
//
// `--scope agents` is the one shared exception: such fixtures (e.g. voice recordings for transcription evals) live
// under `agents/` rather than a user's prefix and are encrypted to the team's agents key as well as the pusher's own,
// so cloud agents can pull what a person pushed, and nobody else can.
//
// Each machine has ONE identity, `DX_FIXTURES_AGE_KEY`: a person's own key locally (agents running locally act as
// that person), and the agents key in the cloud sandbox, where it defaults to the 1Password reference below. A
// cloud agent's pushes are therefore readable by cloud agents only, unless it adds `--recipient <age1...>`.
//
// A fixture is any file: JSON archives are checked as such, anything else (a `.wav`) is carried as-is with its
// extension.
//
// Setup (once per developer):
//   age-keygen -o ~/.config/dxos/fixtures.key     # then store it in 1Password
//   export DX_FIXTURES_AGE_KEY=~/.config/dxos/fixtures.key
//
// Usage:
//   moon run fixtures:push -- <file> --name <name> [--scope agents] [--recipient <age1...>]
//   moon run fixtures:pull -- <name> [--scope agents] [--at <version>] [--user <user>]
//   moon run fixtures:info          # local fixtures + config (the remote has no listing API)
//
// Environment:
//   DX_FIXTURES_AGE_KEY   Path to your age identity file. May be an `op://` reference. In the cloud sandbox
//                         (`CLAUDE_CODE_REMOTE`) it defaults to the agents key.
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

// `YYYYMMDD-HHMMSS`, validated wherever it comes back off the network or a flag.
const VERSION_RE = /^\d{8}-\d{6}$/;

// A file extension, interpolated into keys and filenames like a name.
const EXTENSION_RE = /^[a-z0-9]{1,8}$/;

// Public half of the team's agents key (its secret is in 1Password, eng-dev); `--scope agents` encrypts to it.
const AGENTS_RECIPIENT = 'age197g2gqngxhg9vj3f627hyz8qjcduklz2a048dft29jg4zfwguavqygsjkw';

const SCOPES = ['user', 'agents'];

// Where the agents key's secret is; a cloud agent's identity unless DX_FIXTURES_AGE_KEY says otherwise.
const AGENTS_IDENTITY = 'op://eng-dev/network.dxos.fixtures/credential';

const main = () => {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'push':
      return push(rest);
    case 'pull':
      return pull(rest);
    case 'info':
      return info();
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

  // The capture tool writes `<name>-<version>.json`, so both the asset name and the moment it was
  // captured come from the filename. Adopting the capture stamp - rather than minting an upload
  // time - keeps one identity for the archive on disk and in R2, and makes the version mean "when
  // this mailbox looked like this" rather than "when it happened to be uploaded".
  const { name: parsedName, version: parsedVersion, extension } = parseArchiveName(basename(source));
  const name = validName(flags.name ?? parsedName);
  const version = parsedVersion ?? timestamp();
  const scope = validScope(flags.scope);

  // Sanity-check a JSON payload before it becomes an opaque blob: an archive is a JSON array of
  // serialized messages, and pushing the wrong file is only discoverable after a pull otherwise.
  const contents = extension === 'json' ? `${readArchive(source)} messages` : extension;
  requireBinary('age', 'brew install age');

  // Default to our own public key so a push is always reversible by the pusher; an explicit
  // `--recipient` is the deliberate act of handing one archive to someone else. The agents scope adds the
  // agents key, so any agent can read it too.
  const recipients = [flags.recipient ?? ownRecipient(), ...(scope === 'agents' ? [AGENTS_RECIPIENT] : [])];
  if (flags.recipient) {
    console.warn(`Encrypting for ${flags.recipient} - you will NOT be able to decrypt this archive.\n`);
  }

  const owner = userInfo().username;
  const key = remoteKey({ scope, owner, name, version, extension });
  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  const pointer = join(tmpdir(), `dxos-fixture-${process.pid}.latest`);
  try {
    execFileSync('age', [...recipients.flatMap((recipient) => ['-r', recipient]), '-o', encrypted, source], {
      stdio: 'inherit',
    });
    wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', encrypted, '--remote']);

    // Each push is a new object, so history accumulates rather than overwriting. Nothing can
    // enumerate it (wrangler's R2 surface is get/put/delete), so the newest version is recorded in
    // a companion pointer - a few bytes naming the version, holding no fixture content.
    // A JSON fixture's pointer is the bare version, as before extensions; any other names its extension too.
    writeFileSync(pointer, extension === 'json' ? version : `${version}.${extension}`);
    wrangler(['r2', 'object', 'put', `${BUCKET}/${pointerKey({ scope, owner, name })}`, '--file', pointer, '--remote']);
  } finally {
    rmSync(encrypted, { force: true });
    rmSync(pointer, { force: true });
  }

  console.log(`\nPushed ${contents} (${size(source)}) -> ${key}`);
  console.log(`Pull elsewhere with:  moon run fixtures:pull -- ${name}${scope === 'agents' ? ' --scope agents' : ''}`);
};

const pull = (args) => {
  const { positional, flags } = parseArgs(args);
  if (!positional[0]) {
    usage('pull requires a fixture name (e.g. `inbox`).');
  }
  const name = validName(positional[0]);
  const owner = flags.user ?? userInfo().username;
  const scope = validScope(flags.scope);

  requireBinary('age', 'brew install age');
  const identity = identityFile();

  // An explicit `--at` pins a version (with `--ext` for a non-JSON one); otherwise the pointer names the newest.
  const { version, extension } = flags.at
    ? { version: validVersion(flags.at), extension: validExtension(flags.ext ?? 'json') }
    : readPointer({ scope, owner, name });
  const key = remoteKey({ scope, owner, name, version, extension });

  const out = join(FIXTURES_DIR, `${name}-${version}.${extension}`);
  mkdirSync(dirname(out), { recursive: true });

  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  try {
    wrangler(['r2', 'object', 'get', `${BUCKET}/${key}`, '--file', encrypted, '--remote']);
    execFileSync('age', ['-d', '-i', identity, '-o', out, encrypted], { stdio: 'inherit' });
  } finally {
    rmSync(encrypted, { force: true });
  }

  const contents = extension === 'json' ? `${readArchive(out)} messages` : extension;
  console.log(`\nPulled ${contents} (${size(out)}) -> ${out}`);
  console.log(`Tests resolve it by name: fixturePath('${name}') takes the newest local version.`);
};

/** Newest version of a fixture and its extension, from the pointer object written by `push`. */
const readPointer = (location) => {
  const file = join(tmpdir(), `dxos-fixture-${process.pid}.latest`);
  try {
    wrangler(['r2', 'object', 'get', `${BUCKET}/${pointerKey(location)}`, '--file', file, '--remote']);
    const pointer = readFileSync(file, 'utf8').trim();
    const [version, extension = 'json'] = pointer.split('.');
    if (!VERSION_RE.test(version) || !EXTENSION_RE.test(extension)) {
      fail(`Malformed pointer for "${location.name}": ${JSON.stringify(pointer)}`);
    }
    return { version, extension };
  } finally {
    rmSync(file, { force: true });
  }
};

/**
 * What is available locally and how this machine is configured - the first thing to run when a
 * fixture-backed test skips unexpectedly, since it distinguishes "nothing pulled" from "pulled but
 * misconfigured". Local only: the remote has no listing API (wrangler's R2 surface is
 * get/put/delete), so browse the Cloudflare dashboard for the full history.
 */
const info = () => {
  console.log(`identity:   ${configuredIdentity() ?? '(unset - DX_FIXTURES_AGE_KEY)'}`);
  console.log(`directory:  ${FIXTURES_DIR}`);
  console.log(`bucket:     ${BUCKET}`);
  console.log(`user:       ${userInfo().username}`);

  const entries = existsSync(FIXTURES_DIR) ? readdirSync(FIXTURES_DIR).filter((entry) => !entry.startsWith('.')) : [];
  if (entries.length === 0) {
    console.log('\nNo fixtures pulled. Get one: moon run fixtures:pull -- <name>');
    return;
  }

  // Grouped by asset, newest version first - the one a reader resolves by default is listed first.
  const byName = new Map();
  for (const entry of entries.sort().reverse()) {
    const { name, version } = parseArchiveName(entry);
    byName.set(name, [...(byName.get(name) ?? []), { version, path: join(FIXTURES_DIR, entry) }]);
  }

  console.log('');
  for (const [name, versions] of byName) {
    console.log(`${name}`);
    for (const [index, { version, path }] of versions.entries()) {
      const marker = index === 0 ? '*' : ' ';
      console.log(
        `  ${marker} ${(version ?? '(unversioned)').padEnd(18)} ${size(path).padStart(10)}  ${entryCount(path)}`,
      );
    }
  }
  console.log('\n* = resolved by default');
};

/** Message count of an archive, or a marker when it cannot be read (so info never throws). */
const entryCount = (path) => {
  if (!path.endsWith('.json')) {
    return '';
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(parsed) ? `${parsed.length} entries` : '(not an array)';
  } catch {
    return '(unreadable)';
  }
};

/** Remote folder: the shared agents one, or the user's own. */
const remotePrefix = ({ scope, owner }) => (scope === 'agents' ? 'agents' : `mailbox/${owner}`);

/** Remote key for one version of a named fixture. */
const remoteKey = ({ scope, owner, name, version, extension }) =>
  `${remotePrefix({ scope, owner })}/${name}-${version}.${extension}.age`;

/** Companion object naming the newest version - the stand-in for the listing wrangler cannot do. */
const pointerKey = ({ scope, owner, name }) => `${remotePrefix({ scope, owner })}/${name}.latest`;

/** Sortable, filename-safe UTC stamp: `20260804-181500`. */
const timestamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/**
 * Splits `<name>-<version>.<ext>` (what the capture tool writes) into its parts. A file without a
 * trailing stamp yields no version, so the whole stem is the name and the caller stamps it now.
 */
const parseArchiveName = (filename) => {
  const dot = filename.lastIndexOf('.');
  const extension = validExtension(dot > 0 ? filename.slice(dot + 1).toLowerCase() : 'json');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const match = stem.match(/^(.*)-(\d{8}-\d{6})$/);
  return match ? { name: match[1], version: match[2], extension } : { name: stem, version: undefined, extension };
};

const validExtension = (extension) => {
  if (!EXTENSION_RE.test(extension)) {
    fail(`Invalid file extension: "${extension}".`);
  }
  return extension;
};

const validScope = (scope = 'user') => {
  if (!SCOPES.includes(scope)) {
    fail(`Invalid scope: "${scope}". Use one of: ${SCOPES.join(', ')}.`);
  }
  return scope;
};

const validVersion = (version) => {
  if (!VERSION_RE.test(version)) {
    fail(`Invalid version: "${version}". Expected YYYYMMDD-HHMMSS (e.g. 20260804-181500).`);
  }
  return version;
};

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

/** This machine's identity: `DX_FIXTURES_AGE_KEY`, else the agents key in the cloud sandbox. */
const configuredIdentity = () =>
  process.env.DX_FIXTURES_AGE_KEY || (process.env.CLAUDE_CODE_REMOTE ? AGENTS_IDENTITY : undefined);

/** Path to the age identity file, resolving an `op://` reference to a temporary file. */
const identityFile = () => {
  const configured = configuredIdentity();
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
    // causes it cannot know about - asserting a cause here would misattribute e.g. a missing key.
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
  console.error('  moon run fixtures:push -- <file> --name <name> [--scope agents] [--recipient <age1...>]');
  console.error('  moon run fixtures:pull -- <name> [--scope agents] [--at <version> [--ext <ext>]] [--user <user>]');
  console.error('  moon run fixtures:info');
  process.exit(1);
};

main();
