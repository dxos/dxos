//
// Copyright 2026 DXOS.org
//

/**
 * Startup timing of a returning tab: how long until the shell is usable, and what the tab had
 * fetched and activated by then. The app no longer emits a ready mark, so ready is the user's
 * signal — the account item in the tree — and the rest is read off the performance timeline.
 *
 * Usage: node startup-timing.mjs <url> <profile copy> [--runs 3] [--json out.json]
 *          [--throttle 4g|fast3g] [--service-worker keep]
 * Each run reuses the same profile copy, which is what makes every run a returning tab.
 *
 * The service worker is blocked unless asked for: a seeded profile's worker serves the bundle
 * that seeded it, so with it on, two arms measure the same files. Blocking it measures the
 * network path, which is what a protocol or throttle comparison is about.
 *
 * Throttling goes through CDP on the page, the same mechanism as the DevTools network presets,
 * with the same effective values (DevTools scales its nominal figures by 0.9 on throughput and
 * 3.75 on latency). It covers the page and its dedicated workers; the shared worker fetches
 * unthrottled, so its bundle is the same cost in every arm.
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
const throttle = arg('--throttle', null);
const serviceWorkers = arg('--service-worker', 'block') === 'keep' ? 'allow' : 'block';
const mbps = (n) => (n * 1_000_000 * 0.9) / 8;
// DevTools "Fast 3G" (labelled "Slow 4G" since Chrome 129) and "Fast 4G".
const THROTTLES = {
  'fast3g': { downloadThroughput: mbps(1.6), uploadThroughput: mbps(0.75), latency: 150 * 3.75 },
  '4g': { downloadThroughput: mbps(9), uploadThroughput: mbps(1.5), latency: 85 * 3.75 },
};
if (!url || !profileDir || (throttle && !THROTTLES[throttle])) {
  console.error(
    'usage: startup-timing.mjs <url> <profile copy> [--runs 3] [--json out.json] [--throttle 4g|fast3g] [--service-worker keep]',
  );
  process.exit(1);
}

const results = [];
for (let run = 1; run <= runs; run++) {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    ignoreHTTPSErrors: true,
    serviceWorkers,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  if (throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...THROTTLES[throttle] });
  }
  await page.addInitScript(() => performance.setResourceTimingBufferSize(20_000));
  await page.goto(url, { timeout: 120_000 });
  const ready = await page
    .getByTestId('treeView.userAccount')
    // Fast 3G moves the ~13 MB a returning tab fetches before ready in about 75 s.
    .waitFor({ timeout: throttle ? 400_000 : 90_000 })
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
    // Proof of which protocol served the scripts, since the http/1.1 vs h2 arms differ only there.
    const protocols = {};
    for (const e of scripts) {
      protocols[e.nextHopProtocol || 'unknown'] = (protocols[e.nextHopProtocol || 'unknown'] ?? 0) + 1;
    }
    return {
      protocols,
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
const report = { url, throttle, serviceWorkers, summary, results };
console.log(JSON.stringify(report, null, 2));
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
}
