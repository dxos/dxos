#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Opens the hosted explorer in headless Chromium and checks what a visitor sees (D193): the overview
// renders its counts, a path link opens the definition's card with its source, and no page error or
// failed request happens on the way. `LiveSite.browserShowsTheExplorer` runs it with
// `deus test LiveSite --integration`; it prints one JSON line and exits 1 on a failure.
//
//   node scripts/explorer-smoke.mjs [site] [screenshot directory]

import { chromium } from '@playwright/test';

const site = process.argv[2] ?? 'https://deus.dmytro-a80.workers.dev';
const shots = process.argv[3];
const args = ['--no-sandbox'];
// The cloud sandbox reaches HTTPS only through its proxy, with TLS 1.2 (cloud-sandbox skill).
if (process.env.HTTPS_PROXY) {
  args.push(`--proxy-server=${process.env.HTTPS_PROXY}`, '--ssl-version-max=tls1.2');
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args });
const problems = [];
const checks = {};
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('response', (response) => {
    // The sign-in endpoints answer 401 to a visitor who is not signed in, which is expected.
    if (response.status() >= 400 && !response.url().includes('/api/')) {
      problems.push(`${response.status()} ${response.url()}`);
    }
  });

  const started = Date.now();
  await page.goto(`${site}/@dxos/toolchain/`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  await page.waitForFunction(() => document.getElementById('project')?.textContent === '@dxos/toolchain', null, {
    timeout: 300_000,
  });
  await page.getByText('definitions', { exact: false }).first().waitFor({ timeout: 300_000 });
  checks.overview = Date.now() - started;
  if (shots) {
    await page.screenshot({ path: `${shots}/overview.png` });
  }

  const opened = Date.now();
  await page.goto(`${site}/@dxos/toolchain/List.map`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  const card = page.locator('pre', { hasText: 'def List.map' }).first();
  await card.waitFor({ timeout: 300_000 });
  checks.definition = Date.now() - opened;
  if (shots) {
    await page.screenshot({ path: `${shots}/definition.png` });
  }
} catch (error) {
  problems.push(`failed: ${error.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
console.log(JSON.stringify({ ok: problems.length === 0, checks, problems }));
process.exit(problems.length === 0 ? 0 : 1);
