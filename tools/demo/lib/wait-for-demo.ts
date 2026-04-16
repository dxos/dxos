#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * Block until the composer-app page actually loads `window.__DEMO__`.
 *
 * Used by morning.sh. A plain `curl http://localhost:5173` returns 200
 * even while vite is mid-reoptimizing deps, but the bundle can't load
 * __DEMO__ during that window. This launches a headless Chromium,
 * navigates the page, and verifies __DEMO__ exists.
 *
 * Retries up to 30 times with a 10s dwell per attempt (~5 minute cap).
 * Exits 0 on success, 1 on failure.
 */

import { chromium } from 'playwright';

const URL = process.env.COMPOSER_URL ?? 'http://localhost:5173';
const MAX_ATTEMPTS = 30;
const DWELL_MS = 10_000;

const main = async (): Promise<number> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(DWELL_MS);
      const ok = await page.evaluate(() => Boolean((globalThis as any).__DEMO__));
      if (ok) {
        console.log(`✓ __DEMO__ available (attempt ${attempt})`);
        return 0;
      }
      console.log(`  attempt ${attempt}: __DEMO__ not yet on window`);
    } catch (err) {
      console.log(`  attempt ${attempt}: ${(err as Error).message}`);
    } finally {
      await browser.close();
    }
  }
  console.error('✗ __DEMO__ never loaded');
  return 1;
};

main().then((code) => process.exit(code));
