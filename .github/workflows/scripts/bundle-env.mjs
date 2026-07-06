#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Build the selected app(s)' bundle for an environment. Reads deploy-manifest.json, resolves the apps that
// deploy to <environment>, and runs each app's bundle task with its env-specific config (DX_ENVIRONMENT +
// PostHog). Deploying is a separate step — see deploy-env.mjs.
//
// An app whose output dir is already populated is skipped: that is how a bundle built once and shared via
// artifact is reused (the build-sharing fan-out downloads it into the output dir before this runs, so no
// rebuild — see docs/design/deploy-build-sharing.md).
//
// Usage: bundle-env.mjs <environment> [app|all]

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [environment, app = 'all'] = process.argv.slice(2);
if (!environment) {
  console.error('usage: bundle-env.mjs <environment> [app|all]');
  process.exit(1);
}

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const manifest = JSON.parse(readFileSync(join(root, '.github/workflows/deploy-manifest.json'), 'utf8'));

const targets = Object.entries(manifest).filter(
  ([name, cfg]) => name !== '//' && cfg.environments?.includes(environment) && (app === 'all' || app === name),
);

if (targets.length === 0) {
  console.log(`No apps configured for environment=${environment} app=${app} — nothing to bundle.`);
  process.exit(0);
}

for (const [name, cfg] of targets) {
  const outDir = join(root, cfg.outDir);
  console.log(`::group::Bundle ${name} -> ${environment}`);

  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    console.log(`Output ${cfg.outDir} already present — reusing prebuilt bundle; skipping ${cfg.bundleTask}.`);
    console.log('::endgroup::');
    continue;
  }

  // populate-env.sh exports the app's PostHog vars under its package prefix (composer-app ->
  // COMPOSER_APP_POSTHOG_*); the Vite build reads the DX_POSTHOG_* names, so map them for this build.
  const prefix = cfg.bundleTask.split(':')[0].toUpperCase().replaceAll('-', '_');
  const posthog = process.env[`${prefix}_POSTHOG_API_KEY`]
    ? {
        DX_POSTHOG_API_KEY: process.env[`${prefix}_POSTHOG_API_KEY`],
        DX_POSTHOG_PROJECT_ID: process.env[`${prefix}_POSTHOG_PROJECT_ID`] ?? '',
        DX_POSTHOG_FEEDBACK_SURVEY_ID: process.env[`${prefix}_POSTHOG_FEEDBACK_SURVEY_ID`] ?? '',
        LOG_FILTER: 'error',
      }
    : {};

  execFileSync('moon', ['run', cfg.bundleTask], {
    stdio: 'inherit',
    env: { ...process.env, DX_ENVIRONMENT: environment, ...posthog },
  });
  console.log('::endgroup::');
}
