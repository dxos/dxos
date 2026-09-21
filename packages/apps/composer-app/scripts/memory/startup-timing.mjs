//
// Copyright 2026 DXOS.org
//

/**
 * Startup timing of a returning tab: how long until the shell is usable, and what the tab had
 * fetched and activated by then. The app no longer emits a ready mark, so ready is the user's
 * signal — the account item in the tree — and the rest is read off the performance timeline.
 *
 * Usage: node startup-timing.mjs <url> <profile copy> [--runs 3] [--json out.json]
 * Each run reuses the same profile copy, which is what makes every run a returning tab.
 */

import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [url, profileDir] = process.argv.slice(2);
const arg = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const runs = Number(arg('--runs', '3'));
const jsonOut = arg('--json', null);
if (!url || !profileDir) {
  console.error('usage: startup-timing.mjs <url> <profile copy> [--runs 3] [--json out.json]');
  process.exit(1);
}

const results = [];
for (let run = 1; run <= runs; run++) {
  const context = await chromium.launchPersistentContext(profileDir, { headless: true });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.addInitScript(() => performance.setResourceTimingBufferSize(20_000));
  await page.goto(url, { timeout: 120_000 });
  const ready = await page
    .getByTestId('treeView.userAccount')
    .waitFor({ timeout: 90_000 })
    .then(
      () => true,
      () => false,
    );
  const readyT = await page.evaluate(() => Math.round(performance.now()));
  // The startup pass and the first idle activations land within a few seconds of ready; 20s is
  // past the last of them on every profile measured so far.
  await page.waitForTimeout(20_000);
  const facts = await page.evaluate((readyT) => {
    const marks = performance.getEntriesByType('mark');
    const starts = marks.filter((m) => /^module:.*:start$/.test(m.name)).map((m) => m.startTime);
    const htmlParsed = marks.find((m) => m.name === 'boot:html-parsed')?.startTime ?? null;
    const scripts = performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('/assets/') && e.name.endsWith('.js'));
    const byReady = scripts.filter((e) => e.responseEnd <= readyT);
    const activationsByReady = starts.filter((t) => t <= readyT).length;
    const paint = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
    return {
      htmlParsed: htmlParsed === null ? null : Math.round(htmlParsed),
      firstContentfulPaint: paint ? Math.round(paint.startTime) : null,
      firstActivation: starts.length ? Math.round(Math.min(...starts)) : null,
      activationsByReady,
      activations: starts.length,
      lastActivation: starts.length ? Math.round(Math.max(...starts)) : null,
      scriptsByReady: byReady.length,
      bytesByReady: byReady.reduce((sum, e) => sum + e.decodedBodySize, 0),
      scripts: scripts.length,
      bytes: scripts.reduce((sum, e) => sum + e.decodedBodySize, 0),
    };
  }, readyT);
  await context.close();
  results.push({ run, ready, readyT, ...facts });
  console.error(`run ${run}: ready ${ready ? readyT : 'NOT READY'}ms, last activation ${facts.lastActivation}ms`);
}

const mean = (key) => Math.round(results.reduce((sum, r) => sum + (r[key] ?? 0), 0) / results.length);
const summary = {
  runs: results.length,
  readyMs: mean('readyT'),
  firstContentfulPaintMs: mean('firstContentfulPaint'),
  firstActivationMs: mean('firstActivation'),
  activationsByReady: mean('activationsByReady'),
  lastActivationMs: mean('lastActivation'),
  scriptsByReady: mean('scriptsByReady'),
  bytesByReadyKB: Math.round(mean('bytesByReady') / 1024),
  scripts: mean('scripts'),
  bytesKB: Math.round(mean('bytes') / 1024),
};
console.log(JSON.stringify({ url, summary, results }, null, 2));
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ url, summary, results }, null, 2));
}
