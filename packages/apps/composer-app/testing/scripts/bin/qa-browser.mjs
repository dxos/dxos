//
// Copyright 2026 DXOS.org
//

// Keeps a headless Chromium page on the QA server so the app boots without a visible pane; the
// agent debug port runs inside this page. Stays alive until killed.
//   node packages/apps/composer-app/testing/scripts/bin/qa-browser.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5182/';
// `PW_CHROMIUM_PATH` for a host whose Chromium is not the one Playwright pinned (the cloud sandbox).
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: process.env.PW_CHROMIUM_PATH ? ['--no-sandbox'] : [],
});
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') {
    console.error('[page]', message.text().slice(0, 300));
  }
});
page.on('pageerror', (error) => console.error('[pageerror]', String(error).slice(0, 300)));
await page.goto(url);
await page.waitForFunction(() => document.querySelectorAll('[data-scope]').length > 0, null, { timeout: 600000 });
console.log('mounted');
await new Promise(() => {});
