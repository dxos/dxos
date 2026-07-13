#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Populate Cloudflare Worker secrets (e.g. composer's SIGNOZ_INGESTION_KEY) from a 1Password item, for
// either local dev (`.dev.vars`, read by `wrangler dev`) or a deployed Worker (`wrangler secret put`).
//
// The 1Password item's fields are matched by section label: a field in a section named "shared" applies to
// every target; a field in a section matching the raw Cloudflare Worker name (e.g. "composer-main", from
// wrangler.jsonc's `env.<env>.name`) applies only there. Production's Worker is currently the bare
// "composer" (the legacy Pages-era name, retired once that project goes away), so a "composer-production"
// 1Password section won't match anything until then. Only CONCEALED fields are read.
//
// Requires `CLOUDFLARE_ACCOUNT_ID` in the environment (same variable CI uses) — the account associated
// with this token has more than one account, so wrangler can't disambiguate non-interactively without it.
//
// Usage:
//   secrets.mjs dev    --item <1password-item> [--config <wrangler.jsonc>]
//   secrets.mjs remote <env> --item <1password-item> [--config <wrangler.jsonc>] [--dry-run]
//
// <config> is a path to a wrangler.jsonc (default packages/apps/composer-app/wrangler.jsonc — the only
// app with secrets today). <env> must be one of that config's `env.*` keys (e.g. main, labs, staging,
// production). `--dry-run` lists what would be pushed without calling `wrangler secret put`.
//
// Examples:
//   node scripts/secrets.mjs dev --item "dxos app worker secrets"
//   node scripts/secrets.mjs remote main --item "dxos app worker secrets"

import JSON5 from 'json5';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CONFIG = 'packages/apps/composer-app/wrangler.jsonc';

const args = process.argv.slice(2);
const mode = args[0];
if (mode !== 'dev' && mode !== 'remote') {
  console.error('usage: secrets.mjs <dev|remote> [env] --item <1password-item> [--config <wrangler.jsonc>]');
  process.exit(1);
}

const flagValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const item = flagValue('item');
if (!item) {
  console.error('usage: secrets.mjs <dev|remote> [env] --item <1password-item> [--config <wrangler.jsonc>]');
  process.exit(1);
}
const configPath = flagValue('config') ?? DEFAULT_CONFIG;

// Positional env, only for `remote` (skip over a leading `--flag value` pair if `mode` is the only positional).
const env = mode === 'remote' ? args[1] : undefined;
if (mode === 'remote' && (!env || env.startsWith('--'))) {
  console.error('usage: secrets.mjs remote <env> --item <1password-item> [--config <wrangler.jsonc>]');
  process.exit(1);
}

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const absConfigPath = join(root, configPath);
if (!existsSync(absConfigPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}
const wranglerConf = JSON5.parse(readFileSync(absConfigPath, 'utf8'));

// The 1Password section label is matched against the raw Cloudflare Worker name (production's is currently
// the bare "composer" — the legacy Pages-era name, retired once that project goes away — so it won't match
// a "composer-production" section until then; every other env's name already matches its section exactly).
let workerName;
if (mode === 'remote') {
  workerName = wranglerConf.env?.[env]?.name;
  if (!workerName) {
    const valid = Object.keys(wranglerConf.env ?? {}).join(', ') || '(none defined)';
    console.error(`No env.${env} in ${configPath}. Valid envs: ${valid}`);
    process.exit(1);
  }
} else {
  workerName = wranglerConf.name;
}

console.log(`Fetching secrets from 1Password item "${item}" (section: "shared" or "${workerName}")`);
let itemJson;
try {
  itemJson = JSON.parse(execFileSync('op', ['item', 'get', item, '--format', 'json'], { encoding: 'utf8' }));
} catch (err) {
  console.error(`Failed to read 1Password item "${item}": ${err.stderr?.toString().trim() || err.message}`);
  process.exit(1);
}
const secrets = itemJson.fields.filter(
  (field) =>
    field.type === 'CONCEALED' &&
    field.value !== undefined &&
    (field.section?.label === 'shared' || field.section?.label === workerName),
);

if (secrets.length === 0) {
  console.log(`No matching CONCEALED fields (section "shared" or "${workerName}") — nothing to do.`);
  process.exit(0);
}

if (mode === 'dev') {
  const devVarsPath = join(root, configPath, '..', '.dev.vars');
  console.log(`Writing ${devVarsPath}`);
  const lines = secrets.map((field) => `${field.label}=${field.value}`);
  writeFileSync(devVarsPath, lines.join('\n') + '\n');
  for (const field of secrets) {
    console.log(`  ${field.label}`);
  }
  console.log('Done.');
} else {
  // A name already declared as a `vars` entry for this env can't also be `secret put` under the same
  // binding name.
  const targetVars = wranglerConf.env?.[env]?.vars ?? wranglerConf.vars ?? {};
  const skipLabels = new Set(Object.keys(targetVars));
  const dryRun = args.includes('--dry-run');

  if (!dryRun) {
    try {
      execFileSync('pnpm', ['exec', 'wrangler', 'deployments', 'list', '--config', absConfigPath, '--env', env], {
        stdio: 'pipe',
      });
    } catch (err) {
      const stderr = err.stderr?.toString() ?? '';
      if (/could not find|does not exist/i.test(stderr)) {
        console.error(`Worker "${workerName}" does not exist — deploy it first (Deploy Apps) before pushing secrets.`);
      } else {
        console.error(`Could not verify worker "${workerName}" exists:\n${stderr || err.message}`);
      }
      process.exit(1);
    }
  }

  console.log(`${dryRun ? '[dry-run] Would push' : 'Pushing'} secrets to "${workerName}" (env=${env})`);
  const failed = [];
  for (const field of secrets) {
    if (skipLabels.has(field.label)) {
      console.log(`  skip ${field.label} (already a wrangler var for this env)`);
      continue;
    }
    console.log(`  ${field.label}`);
    if (dryRun) {
      continue;
    }
    try {
      execFileSync(
        'pnpm',
        ['exec', 'wrangler', 'secret', 'put', field.label, '--config', absConfigPath, '--env', env],
        { input: field.value, stdio: ['pipe', 'inherit', 'inherit'] },
      );
    } catch (err) {
      console.error(`  failed: ${field.label}: ${err.message}`);
      failed.push(field.label);
    }
  }

  if (failed.length > 0) {
    console.error(`Failed to push ${failed.length} secret(s): ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('Done.');
}
