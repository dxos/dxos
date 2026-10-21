#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Opens a page as a QA step's browser (task 6719ed0e): `deus mdl --base <url> --browser` sends a step's GET
// here, so its assertion sees the page after its scripts ran, not the bytes the server sent. Prints the
// response status on the first line, then the rendered document; page errors fail the step.
//
//   node scripts/qa-browser.mjs <url>

import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const url = process.argv[2];
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';
const args = ['--no-sandbox'];
// The cloud sandbox reaches HTTPS only through its proxy, with TLS 1.2 (cloud-sandbox skill).
if (process.env.HTTPS_PROXY && url.startsWith('https:')) {
  args.push(`--proxy-server=${process.env.HTTPS_PROXY}`, '--ssl-version-max=tls1.2');
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined),
  args,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // A page is judged as rendered; anything else a browser shows as it came, so its body is the content.
  const isPage = (response?.headers()['content-type'] ?? '').includes('text/html');
  const html = isPage ? await page.content() : ((await response?.text()) ?? '');
  if (errors.length > 0) {
    process.stdout.write(`500\npage error: ${errors.join('; ')}`);
  } else {
    // No newline after the content, which is compared exactly.
    process.stdout.write(`${response?.status() ?? 0}\n${html}`);
  }
} catch (error) {
  process.stdout.write(`0\n${error.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
