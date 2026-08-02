//
// Copyright 2026 DXOS.org
//

/**
 * Capture a V8 CPU profile of composer-app startup and attribute main-thread
 * self-time per package/plugin.
 *
 * Why: the plugin manager's `module:*` performance.measure entries overlap under
 * `concurrency: 'unbounded'`, so wall-clock per module cannot attribute where the
 * main thread actually spends time (N concurrent modules each "cost" the same
 * contended window). A sampling profile is the ground truth.
 *
 * Usage:
 *   node scripts/profile-startup.mjs [--url http://localhost:5180] [--out DIR] [--label NAME]
 *
 * Output (in --out, default test-results/composer-app):
 *   startup-<label>.cpuprofile   — load into Chrome DevTools > Performance > Load profile
 *   startup-<label>-attribution.json
 *   and a self-time-by-package table on stdout.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const url = arg('url', 'http://localhost:5180');
const outDir = arg('out', path.join(process.cwd(), 'test-results', 'composer-app'));
const label = arg('label', 'profile');
const readyTimeout = Number(arg('timeout', '120000'));

/**
 * Map a script URL to a human attribution bucket.
 * Dev-server URLs expose real monorepo paths (/@fs/... or /src/...); prod preview
 * exposes chunk names which include plugin names via `chunkFileNames`.
 */
const bucketOf = (scriptUrl) => {
  if (!scriptUrl) {
    return '(anonymous)';
  }
  let match = scriptUrl.match(/packages\/(plugins|sdk|core|ui|common|apps)\/([^/]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  match = scriptUrl.match(/node_modules(?:\/\.vite\/deps)?\/((?:@[^/]+\/)?[^/?]+)/);
  if (match) {
    return `dep:${match[1]}`;
  }
  match = scriptUrl.match(/\/assets\/([^/]+?)(?:-[A-Za-z0-9_]{8,})?\.js/);
  if (match) {
    return `chunk:${match[1]}`;
  }
  if (scriptUrl.includes('/@vite/') || scriptUrl.includes('vite/dist/client')) {
    return 'vite-client';
  }
  return scriptUrl.replace(/^https?:\/\/[^/]+/, '').slice(0, 80) || '(page)';
};

const aggregate = (profile) => {
  const { nodes, samples, timeDeltas } = profile;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selfMicros = new Map();
  for (let i = 0; i < samples.length; i++) {
    const delta = timeDeltas[i] ?? 0;
    if (delta <= 0) {
      continue;
    }
    const node = nodeById.get(samples[i]);
    if (!node) {
      continue;
    }
    const frame = node.callFrame ?? {};
    const isIdle = frame.functionName === '(idle)' || frame.functionName === '(program)';
    const key = isIdle ? `(${frame.functionName.replace(/[()]/g, '')})` : bucketOf(frame.url);
    selfMicros.set(key, (selfMicros.get(key) ?? 0) + delta);
  }
  return [...selfMicros.entries()]
    .map(([bucket, micros]) => ({ bucket, ms: Math.round(micros / 1000) }))
    .sort((a, b) => b.ms - a.ms);
};

const main = async () => {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const startedAt = Date.now();

  await page.goto(url);
  let ready = true;
  await page
    .getByTestId('treeView.userAccount')
    .waitFor({ timeout: readyTimeout })
    .catch(() => {
      ready = false;
    });
  const navToReady = Date.now() - startedAt;

  const { profile } = await cdp.send('Profiler.stop');
  const snapshot = await page
    .evaluate(() => (window /** @type {any} */).composer?.profiler?.snapshot?.() ?? null)
    .catch(() => null);
  await browser.close();

  const attribution = aggregate(profile);
  const totalMs = attribution.reduce((sum, entry) => sum + entry.ms, 0);

  const profilePath = path.join(outDir, `startup-${label}.cpuprofile`);
  writeFileSync(profilePath, JSON.stringify(profile));
  const reportPath = path.join(outDir, `startup-${label}-attribution.json`);
  writeFileSync(
    reportPath,
    `${JSON.stringify({ url, label, ready, navToReady, totalMs, attribution, snapshot }, null, 2)}\n`,
  );

  console.log(`\nurl: ${url}  ready: ${ready}  navToReady: ${navToReady}ms  sampled: ${totalMs}ms`);
  console.log(`profile: ${profilePath}`);
  console.log(`report:  ${reportPath}\n`);
  console.log('self-time by bucket (top 40):');
  for (const { bucket, ms } of attribution.slice(0, 40)) {
    console.log(`${String(ms).padStart(8)} ms  ${bucket}`);
  }
};

await main();
