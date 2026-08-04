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
//  2. Every object is encrypted with `age` BEFORE it leaves the machine, so bucket read access alone
//     does not yield a readable inbox.
//
// CI never has either credential, so `pull` cannot succeed there; fixture-backed tests stay gated on
// the file's presence and skip. That is an absence of capability rather than a policy.
//
// Usage:
//   fixtures.mjs push <file> [--name <name>]   Encrypt and upload; prints the key.
//   fixtures.mjs pull [<key>] [--out <file>]   Download and decrypt (defaults to the newest).
//   fixtures.mjs list                          List this user's fixtures.
//
// Environment:
//   DX_FIXTURES_AGE_RECIPIENT  age public key (push). May be an `op://` reference.
//   DX_FIXTURES_AGE_KEY        Path to the age identity file (pull). May be an `op://` reference.
//   DX_FIXTURES_BUCKET         Overrides the bucket name (default `test-fixtures`).
//   CLOUDFLARE_ACCOUNT_ID      Required by wrangler when the token spans several accounts.
//
// Examples:
//   node scripts/fixtures.mjs push ~/Downloads/mailbox-feed.json --name inbox
//   node scripts/fixtures.mjs pull
//   node scripts/fixtures.mjs pull mailbox/burdon/inbox-2026-08-04.json.age

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_BUCKET = process.env.DX_FIXTURES_BUCKET ?? 'test-fixtures';

// Decrypted fixtures may only land here: the directory is git-ignored, so a fixture cannot be
// committed by a stray `git add -A`, and every consumer already reads from this path.
const LOCAL_DIR = join(REPO_ROOT, 'packages/stories/stories-brain/fixtures/local');
const DEFAULT_OUT = join(LOCAL_DIR, 'mailbox-feed.json');

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

  const recipient = resolveSecret('DX_FIXTURES_AGE_RECIPIENT');
  if (!recipient) {
    fail('DX_FIXTURES_AGE_RECIPIENT is required (the team age public key).');
  }
  // Sanity-check the payload before it becomes an opaque blob: an archive is a JSON array of
  // serialized messages, and pushing the wrong file is only discoverable after a pull otherwise.
  const messages = readArchive(source);
  const key = `mailbox/${userInfo().username}/${flags.name ?? 'mailbox-feed'}-${today()}.json.age`;
  requireBinary('age', 'brew install age');

  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  try {
    execFileSync('age', ['-r', recipient, '-o', encrypted, source], { stdio: 'inherit' });
    wrangler(['r2', 'object', 'put', `${DEFAULT_BUCKET}/${key}`, '--file', encrypted, '--remote']);
  } finally {
    rmSync(encrypted, { force: true });
  }

  console.log(`\nPushed ${messages} messages (${size(source)}) → ${key}`);
  console.log(`Pull elsewhere with:  pnpm fixtures pull ${key}`);
};

const pull = (args) => {
  const { positional, flags } = parseArgs(args);
  const identity = resolveSecret('DX_FIXTURES_AGE_KEY');
  if (!identity) {
    fail('DX_FIXTURES_AGE_KEY is required (path to the age identity file).');
  }
  const out = flags.out ? resolve(flags.out) : DEFAULT_OUT;
  if (!out.startsWith(LOCAL_DIR)) {
    fail(`Refusing to write outside ${LOCAL_DIR} (it is git-ignored; fixtures must never be committed).`);
  }
  requireBinary('age', 'brew install age');

  const key = positional[0] ?? latestKey();
  if (!key) {
    fail(`No fixtures found for ${userInfo().username} in ${DEFAULT_BUCKET}.`);
  }
  mkdirSync(dirname(out), { recursive: true });

  const encrypted = join(tmpdir(), `dxos-fixture-${process.pid}.age`);
  try {
    wrangler(['r2', 'object', 'get', `${DEFAULT_BUCKET}/${key}`, '--file', encrypted, '--remote']);
    execFileSync('age', ['-d', '-i', identity, '-o', out, encrypted], { stdio: 'inherit' });
  } finally {
    rmSync(encrypted, { force: true });
  }

  const messages = readArchive(out);
  console.log(`\nPulled ${messages} messages (${size(out)}) → ${out}`);
  console.log('Consumers read this path by default; override with MAILBOX_FEED_FIXTURE.');
};

const list = () => {
  const prefix = `mailbox/${userInfo().username}/`;
  const output = wrangler(['r2', 'bucket', 'object', 'list', DEFAULT_BUCKET, '--prefix', prefix, '--remote'], {
    capture: true,
  });
  console.log(output.trim() || `No fixtures under ${prefix}.`);
};

/** Newest key under this user's prefix, by the date embedded in the name. */
const latestKey = () => {
  const prefix = `mailbox/${userInfo().username}/`;
  const output = wrangler(['r2', 'bucket', 'object', 'list', DEFAULT_BUCKET, '--prefix', prefix, '--remote'], {
    capture: true,
  });
  const keys = [...output.matchAll(/"key"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
  return keys.sort().at(-1);
};

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

const wrangler = (args, { capture = false } = {}) => {
  requireBinary('wrangler', 'pnpm add -g wrangler');
  try {
    return execFileSync('wrangler', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    });
  } catch (error) {
    fail(`wrangler ${args.slice(0, 3).join(' ')} failed. Check CLOUDFLARE_ACCOUNT_ID and \`wrangler login\`.`);
    throw error;
  }
};

/**
 * Reads a secret from the environment, resolving `op://` references through the 1Password CLI so the
 * age key can be stored there rather than exported in a shell profile (matching `pnpm 1p-credentials`).
 */
const resolveSecret = (name) => {
  const value = process.env[name];
  if (!value?.startsWith('op://')) {
    return value;
  }
  requireBinary('op', 'brew install 1password-cli');
  return execFileSync('op', ['read', value], { encoding: 'utf8' }).trim();
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

const today = () => new Date().toISOString().slice(0, 10);

const size = (file) => `${(statSync(file).size / 1024).toFixed(0)} KB`;

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const usage = (message) => {
  console.error(`${message}\n`);
  console.error('Usage:');
  console.error('  fixtures.mjs push <file> [--name <name>]');
  console.error('  fixtures.mjs pull [<key>] [--out <file>]');
  console.error('  fixtures.mjs list');
  process.exit(1);
};

main();
