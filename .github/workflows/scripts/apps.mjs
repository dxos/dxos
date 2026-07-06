#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// The deployable apps. Each entry is a package directory containing a `wrangler.jsonc`; everything else is
// derived from that config + its location:
//   - name         := config `name` (the production Worker name).
//   - bundleTask    := `<dir basename>:bundle` (the moon task; project name follows the dir).
//   - outDir        := config `assets.directory`, resolved relative to the config.
//   - environments  := the config's `env.*` keys.
//   - wranglerConfig := `<dir>/wrangler.jsonc`.
// This list is the ONLY thing not inferable — the repo has other wrangler configs (discord-worker,
// composer-dxos-org, edge) that are deliberately not part of this deploy pipeline. Add an app by adding its
// directory here. Consumed by bundle-env.mjs, deploy-env.mjs, and deploy-apps.yml.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const APP_DIRS = [
  'packages/apps/composer-app',
  'docs',
  'tools/storybook-react',
  'packages/apps/todomvc',
  'packages/apps/tasks',
  'packages/apps/testbench-app',
];

// Strip `//` and `/* */` comments that fall outside string literals, so a wrangler.jsonc parses as JSON.
// String contents are copied verbatim (so `https://…` inside a value is safe). Configs use no trailing commas.
const stripJsonc = (src) => {
  let out = '';
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '"') {
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
};

// Resolve the deployable apps, optionally filtered by environment and/or a single app name.
export const resolveApps = (root, { environment, only = 'all' } = {}) =>
  APP_DIRS.map((dir) => {
    const wranglerConfig = join(dir, 'wrangler.jsonc');
    const config = JSON.parse(stripJsonc(readFileSync(join(root, wranglerConfig), 'utf8')));
    return {
      name: config.name,
      dir,
      wranglerConfig,
      bundleTask: `${basename(dir)}:bundle`,
      outDir: join(dir, config.assets.directory),
      environments: Object.keys(config.env ?? {}),
    };
  }).filter(
    (app) =>
      (!environment || app.environments.includes(environment)) && (only === 'all' || only === app.name),
  );

// CLI: `apps.mjs <environment> [app|all]` prints the resolved app names, one per line.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [environment, only = 'all'] = process.argv.slice(2);
  const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  for (const app of resolveApps(root, { environment, only })) {
    console.log(app.name);
  }
}
