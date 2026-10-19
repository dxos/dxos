#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Uploads a showcase run's light and dark videos and sets each plugin's showcase entry in its `dx.config.ts`
 * `screenshots`. `overnight.mjs --publish` calls it per flow as the run goes; on its own it publishes a finished run,
 * so a run recorded without keys can be published later without re-recording:
 *
 *   node tools/autocue/showcase/publish.mjs --run temp/showcase/<run> [--only map,chess]
 *
 * R2 keys come from the environment or from the gitignored `.secrets/r2.env` (mode 600), filled once per session:
 *
 *   umask 077; op run --no-masking --env-file ~/.env.tpl -- sh -c 'printf "R2_ACCESS_KEY_ID=%s\nR2_SECRET_ACCESS_KEY=%s\n" \
 *     "$DX_CLOUDFLARE_R2_ACCESS_KEY_ID" "$DX_CLOUDFLARE_R2_SECRET_ACCESS_KEY"' > .secrets/r2.env
 *
 * `--no-masking` matters: `op run` otherwise replaces every secret it prints with `<concealed by 1Password>`.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { setShowcaseScreenshot } from './screenshots.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

/** R2 keys from the environment, else the session cache; `undefined` when neither holds a usable key. */
export const r2Keys = (env = process.env) => {
  const keys = {
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID || env.DX_CLOUDFLARE_R2_ACCESS_KEY_ID || env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY:
      env.R2_SECRET_ACCESS_KEY || env.DX_CLOUDFLARE_R2_SECRET_ACCESS_KEY || env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  };
  const cached = path.join(ROOT, '.secrets', 'r2.env');
  if (existsSync(cached)) {
    for (const [, name, value] of readFileSync(cached, 'utf8').matchAll(/^(?:export )?(R2_[A-Z_]+)=(.*)$/gm)) {
      keys[name] ||= value.trim().replace(/^"(.*)"$/, '$1');
    }
  }
  // A masked `op run` writes `<concealed by 1Password>`; R2 access key ids are 32 hex characters.
  const usable = /^[0-9a-f]{32}$/i.test(keys.R2_ACCESS_KEY_ID ?? '') && (keys.R2_SECRET_ACCESS_KEY ?? '').length >= 32;
  return usable ? keys : undefined;
};

const run = (command, args, env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => resolve({ code, output }));
  });

/** Uploads one video to the Composer media bucket; returns its public URL (with its `?v=`) or the error. */
const upload = async (file, key, keys) => {
  const env = { ...process.env, ...keys, R2_BUCKET: 'composer', R2_PUBLIC_BASE: 'https://assets.composer.space' };
  const script = path.join(ROOT, '.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs');
  const { code, output } = await run(process.execPath, [script, file, '--key', key], env);
  const last = output.trim().split('\n').pop();
  return code === 0 && last.startsWith('https://') ? { url: last } : { error: last };
};

/** Publishes one flow: uploads its two videos and points its plugin's showcase screenshot at them. */
export const publishFlow = async (flow, { light, dark }, keys) => {
  const pkgDir = path.dirname(path.dirname(path.resolve(ROOT, flow)));
  const pkg = path.basename(pkgDir);
  const date = new Date().toLocaleDateString('en-CA');
  const lightUp = await upload(path.resolve(ROOT, light), `demos/${date}-${pkg}-showcase-light.mp4`, keys);
  const darkUp = await upload(path.resolve(ROOT, dark), `demos/${date}-${pkg}-showcase.mp4`, keys);
  if (!lightUp.url || !darkUp.url) {
    return { published: `upload failed: ${lightUp.error ?? darkUp.error}` };
  }
  const config = path.join(pkgDir, 'dx.config.ts');
  const set = setShowcaseScreenshot(config, pkg, { light: lightUp.url, dark: darkUp.url });
  if (set) {
    await run('npx', ['oxfmt', '--write', config], process.env);
  }
  return {
    published: set ? path.relative(ROOT, config) : 'uploaded; no dx.config.ts',
    light: lightUp.url,
    dark: darkUp.url,
  };
};

// CLI: publish a finished run from its report.json.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: options } = parseArgs({ options: { run: { type: 'string' }, only: { type: 'string' } } });
  if (!options.run) {
    console.error('usage: publish.mjs --run temp/showcase/<run> [--only map,chess]');
    process.exit(2);
  }
  const keys = r2Keys();
  if (!keys) {
    console.error("no usable R2 keys: fill .secrets/r2.env with the command in this file's header");
    process.exit(2);
  }
  const reportFile = path.resolve(ROOT, options.run, 'report.json');
  const results = JSON.parse(readFileSync(reportFile, 'utf8'));
  const only = options.only?.split(',').map((name) => name.trim());
  const flows = [...new Set(results.map((result) => result.flow))];
  let failed = 0;
  for (const flow of flows) {
    const variants = Object.fromEntries(
      results.filter((result) => result.flow === flow).map((result) => [result.theme, result]),
    );
    const name = variants.light?.name ?? variants.dark?.name;
    if ((only && !only.includes(name)) || !variants.light?.ok || !variants.dark?.ok) {
      continue;
    }
    const outcome = await publishFlow(flow, { light: variants.light.video, dark: variants.dark.video }, keys);
    Object.assign(variants.dark, outcome);
    failed += outcome.light ? 0 : 1;
    console.log(`${name}: ${outcome.published}`);
    writeFileSync(reportFile, JSON.stringify(results, null, 2));
  }
  process.exit(failed === 0 ? 0 : 1);
}
