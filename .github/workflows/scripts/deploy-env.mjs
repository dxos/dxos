#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Deploy already-built app(s) to a Cloudflare environment via `wrangler deploy`. Resolves the deployable
// apps (apps.mjs) for <environment> and deploys each using its committed Workers config — every app owns a
// wrangler.jsonc (composer: a `_worker.js` Worker + bindings; the rest: assets-only), so nothing is
// generated at deploy time. Building is a separate step (bundle-env.mjs); this assumes each app's output
// dir is already populated.
//
// The per-env Worker is selected with `--env <environment>`: each config's env.<environment> sets the
// Worker name — production = the bare name that carries the custom domain, other envs = <name>-<env>.
//
// Usage: deploy-env.mjs <environment> [app|all]

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveApps } from './apps.mjs';

const [environment, only = 'all'] = process.argv.slice(2);
if (!environment) {
  console.error('usage: deploy-env.mjs <environment> [app|all]');
  process.exit(1);
}

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const apps = resolveApps(root, { environment, only });

if (apps.length === 0) {
  const valid =
    resolveApps(root, { environment })
      .map((app) => app.name)
      .join(', ') || '(none)';
  console.error(`"${only}" has no env.${environment} — nothing would be deployed. Apps with that env: ${valid}`);
  process.exit(1);
}

for (const { name, outDir, wranglerConfig } of apps) {
  console.log(`::group::Deploy ${name} -> ${environment}`);

  // A `_worker.js` in the asset dir is the Worker script (Pages advanced-mode carryover), not an asset —
  // keep it out of the upload. Pure-static apps have no `_worker.js`, so this is skipped for them.
  if (existsSync(join(root, outDir, '_worker.js'))) {
    writeFileSync(join(root, outDir, '.assetsignore'), '_worker.js\n');
  }

  execFileSync('pnpm', ['exec', 'wrangler', 'deploy', '--config', join(root, wranglerConfig), '--env', environment], {
    stdio: 'inherit',
    env: { ...process.env, DX_ENVIRONMENT: environment },
  });
  console.log('::endgroup::');
}
