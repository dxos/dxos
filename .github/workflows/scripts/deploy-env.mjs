#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Deploy already-built app(s) to a Cloudflare environment via `wrangler deploy`. Reads deploy-manifest.json,
// resolves the apps for <environment>, and deploys each using its committed Workers config (`wranglerConfig`)
// — every app owns one (composer: a `_worker.js` Worker + bindings; the rest: assets-only), so nothing is
// generated at deploy time. Building is a separate step (bundle-env.mjs); this assumes each app's output dir
// is already populated.
//
// The per-env Worker is selected with `--env <environment>`: each config's [env.<environment>] sets the
// Worker name — production = the bare name that carries the custom domain, other envs = <name>-<env>.
//
// Usage: deploy-env.mjs <environment> [app|all]

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [environment, app = 'all'] = process.argv.slice(2);
if (!environment) {
  console.error('usage: deploy-env.mjs <environment> [app|all]');
  process.exit(1);
}

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const manifest = JSON.parse(readFileSync(join(root, '.github/workflows/deploy-manifest.json'), 'utf8'));

const targets = Object.entries(manifest).filter(
  ([name, cfg]) => name !== '//' && cfg.environments?.includes(environment) && (app === 'all' || app === name),
);

if (targets.length === 0) {
  console.log(`No apps configured for environment=${environment} app=${app} — nothing to deploy.`);
  process.exit(0);
}

for (const [name, cfg] of targets) {
  const outDir = join(root, cfg.outDir);
  console.log(`::group::Deploy ${name} -> ${environment}`);

  // A `_worker.js` in the asset dir is the Worker script (Pages advanced-mode carryover), not an asset —
  // keep it out of the upload. Pure-static apps have no `_worker.js`, so this is skipped for them.
  if (existsSync(join(outDir, '_worker.js'))) {
    writeFileSync(join(outDir, '.assetsignore'), '_worker.js\n');
  }

  execFileSync('pnpm', ['exec', 'wrangler', 'deploy', '--config', join(root, cfg.wranglerConfig), '--env', environment], {
    stdio: 'inherit',
    env: { ...process.env, DX_ENVIRONMENT: environment },
  });
  console.log('::endgroup::');
}
