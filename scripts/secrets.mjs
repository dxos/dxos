#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Populate Cloudflare Worker secrets (e.g. composer's SIGNOZ_INGESTION_KEY, docs' DX_POSTHOG_API_KEY) from
// a 1Password item, for either local dev (`.dev.vars`, read by `wrangler dev`) or deployed Worker(s)
// (`wrangler secret put`).
//
// The 1Password item's fields are matched by section label: a field in a section named "shared" applies to
// every target; a field in a section matching the raw Cloudflare Worker name (e.g. "composer-main", from
// wrangler.jsonc's `env.<env>.name`) applies only there. Only CONCEALED fields are read.
//
// Requires `CLOUDFLARE_ACCOUNT_ID` in the environment (same variable CI uses) — the account associated
// with this token has more than one account, so wrangler can't disambiguate non-interactively without it.
//
// Usage:
//   secrets.mjs dev    <app>           [--item <1password-item-or-uuid>]
//   secrets.mjs remote <env> [app|all] [--item <1password-item-or-uuid>] [--dry-run]
//   secrets.mjs <dev|remote> [<env>] --config <wrangler.jsonc> [--item <1password-item-or-uuid>]
//
// <app> (dev, required) / [app|all] (remote, defaults to `all` — the whole environment) names an app from
// apps.mjs's APP_DIRS by its wrangler.jsonc `name` (the bare production Worker name, e.g. `composer`,
// `docs`). There is no default app — dev requires one explicitly, remote's default of `all` pushes to
// every app that defines <env>, matching bundle-env.mjs/deploy-env.mjs's convention.
//
// `--config` is an escape hatch for a wrangler.jsonc NOT in apps.mjs's APP_DIRS (e.g. discord-worker,
// composer-dxos-org, edge — deliberately excluded from the deploy pipeline); it targets that single config
// directly instead of resolving apps.mjs.
//
// `--item` defaults to the "dxos app worker secrets" item's UUID — pinned rather than its display name,
// since the name can be renamed/retitled in 1Password but the UUID never changes.
//
// Examples:
//   node scripts/secrets.mjs dev composer
//   node scripts/secrets.mjs remote staging
//   node scripts/secrets.mjs remote staging composer

import JSON5 from 'json5';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveApps } from '../.github/workflows/scripts/apps.mjs';

// 1Password item "dxos app worker secrets" — referenced by UUID (stable) rather than name (renamable).
const DEFAULT_ITEM = 'x5yuqygiiomwsd2fikbzvwpd6i';

const args = process.argv.slice(2);
const mode = args[0];
if (mode !== 'dev' && mode !== 'remote') {
  console.error('usage: secrets.mjs <dev|remote> ... — see the header comment for full usage');
  process.exit(1);
}

const flagValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const item = flagValue('item') ?? DEFAULT_ITEM;
const explicitConfig = flagValue('config');
const dryRun = args.includes('--dry-run');
const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

// Positional args after `mode`, skipping over `--flag value` pairs (`--dry-run` is boolean — it has no
// value to skip).
const positionals = [];
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--dry-run') {
    continue;
  }
  if (args[i].startsWith('--')) {
    i++; // also skip its value
    continue;
  }
  positionals.push(args[i]);
}

const allAppNames = () =>
  resolveApps(root)
    .map((app) => app.name)
    .join(', ');

// Resolve the target app(s) — either the `--config` escape hatch (a single config outside apps.mjs) or
// apps.mjs's list, filtered by environment (remote) and/or an explicit app name.
let targets; // [{ name, wranglerConfig }]
let environment; // remote only
if (explicitConfig) {
  environment = mode === 'remote' ? positionals[0] : undefined;
  if (mode === 'remote' && !environment) {
    console.error('usage: secrets.mjs remote <env> --config <wrangler.jsonc> [--item <1password-item>]');
    process.exit(1);
  }
  targets = [{ name: null, wranglerConfig: explicitConfig }];
} else if (mode === 'dev') {
  const appName = positionals[0];
  if (!appName) {
    console.error('usage: secrets.mjs dev <app> [--item <1password-item>]');
    console.error(`  <app> must be one of: ${allAppNames()}`);
    process.exit(1);
  }
  const apps = resolveApps(root, { only: appName });
  if (apps.length === 0) {
    console.error(`Unknown app "${appName}". Valid apps: ${allAppNames()}`);
    process.exit(1);
  }
  targets = apps;
} else {
  environment = positionals[0];
  const only = positionals[1] ?? 'all';
  if (!environment) {
    console.error('usage: secrets.mjs remote <env> [app|all] [--item <1password-item>] [--dry-run]');
    process.exit(1);
  }
  const apps = resolveApps(root, { environment, only });
  if (apps.length === 0) {
    const valid =
      resolveApps(root, { environment })
        .map((app) => app.name)
        .join(', ') || '(none)';
    console.error(`No app "${only}" defines env.${environment}. Apps with that env: ${valid}`);
    process.exit(1);
  }
  targets = apps;
}

console.log(`Fetching secrets from 1Password item "${item}"`);
let itemJson;
try {
  itemJson = JSON.parse(execFileSync('op', ['item', 'get', item, '--format', 'json'], { encoding: 'utf8' }));
} catch (err) {
  console.error(`Failed to read 1Password item "${item}": ${err.stderr?.toString().trim() || err.message}`);
  process.exit(1);
}

let anyFailed = false;
for (const target of targets) {
  const absConfigPath = join(root, target.wranglerConfig);
  if (!existsSync(absConfigPath)) {
    console.error(`Config not found: ${target.wranglerConfig}`);
    anyFailed = true;
    continue;
  }
  const wranglerConf = JSON5.parse(readFileSync(absConfigPath, 'utf8'));

  // The 1Password section label is matched against the raw Cloudflare Worker name (production's is
  // currently the bare app name — the legacy Pages-era name, retired once that project goes away — so it
  // won't match a "<app>-production" section until then; every other env's name already matches exactly).
  let workerName;
  if (mode === 'remote') {
    workerName = wranglerConf.env?.[environment]?.name;
    if (!workerName) {
      const valid = Object.keys(wranglerConf.env ?? {}).join(', ') || '(none defined)';
      console.error(`No env.${environment} in ${target.wranglerConfig}. Valid envs: ${valid}`);
      anyFailed = true;
      continue;
    }
  } else {
    workerName = wranglerConf.name;
  }

  console.log(`\n--- ${workerName} (section: "shared" or "${workerName}") ---`);
  const secrets = itemJson.fields.filter(
    (field) =>
      field.type === 'CONCEALED' &&
      field.value !== undefined &&
      (field.section?.label === 'shared' || field.section?.label === workerName),
  );

  if (secrets.length === 0) {
    console.log(`No matching CONCEALED fields — nothing to do.`);
    continue;
  }

  if (mode === 'dev') {
    const devVarsPath = join(root, target.wranglerConfig, '..', '.dev.vars');
    console.log(`Writing ${devVarsPath}`);
    const lines = secrets.map((field) => `${field.label}=${field.value}`);
    writeFileSync(devVarsPath, lines.join('\n') + '\n');
    for (const field of secrets) {
      console.log(`  ${field.label}`);
    }
    continue;
  }

  // A name already declared as a `vars` entry for this env can't also be `secret put` under the same
  // binding name.
  const targetVars = wranglerConf.env?.[environment]?.vars ?? wranglerConf.vars ?? {};
  const skipLabels = new Set(Object.keys(targetVars));

  if (!dryRun) {
    try {
      execFileSync(
        'pnpm',
        ['exec', 'wrangler', 'deployments', 'list', '--config', absConfigPath, '--env', environment],
        { stdio: 'pipe' },
      );
    } catch (err) {
      const stderr = err.stderr?.toString() ?? '';
      if (/could not find|does not exist/i.test(stderr)) {
        console.error(`Worker "${workerName}" does not exist — deploy it first (Deploy Apps) before pushing secrets.`);
      } else {
        console.error(`Could not verify worker "${workerName}" exists:\n${stderr || err.message}`);
      }
      anyFailed = true;
      continue;
    }
  }

  console.log(`${dryRun ? '[dry-run] Would push' : 'Pushing'} secrets to "${workerName}" (env=${environment})`);
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
        ['exec', 'wrangler', 'secret', 'put', field.label, '--config', absConfigPath, '--env', environment],
        { input: field.value, stdio: ['pipe', 'inherit', 'inherit'] },
      );
    } catch (err) {
      console.error(`  failed: ${field.label}: ${err.message}`);
      failed.push(field.label);
    }
  }

  if (failed.length > 0) {
    console.error(`Failed to push ${failed.length} secret(s) to "${workerName}": ${failed.join(', ')}`);
    anyFailed = true;
  }
}

if (anyFailed) {
  process.exit(1);
}
console.log('\nDone.');
