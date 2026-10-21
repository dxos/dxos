#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// What a visitor sees on a page, as text, for an agent exploring a site the way a person would
// (Dmytro: "having small subagent like haiku explore the site without prompting"). It opens the
// URL in headless Chromium, clicks each `--click <text>` in turn, and prints the address, the
// visible text and the links and buttons there are to follow.
//
//   node scripts/visit.mjs <url> [--click <text>]… [--shot <file.png>] [--full] [--scroll <css selector>]

import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const url = args.shift();
const clicks = [];
let shot;
let full = false;
let scroll;
while (args.length > 0) {
  const flag = args.shift();
  if (flag === '--click') {
    clicks.push(args.shift());
  } else if (flag === '--shot') {
    shot = args.shift();
  } else if (flag === '--full') {
    full = true;
  } else if (flag === '--scroll') {
    scroll = args.shift();
  }
}
if (!url) {
  console.error('usage: node scripts/visit.mjs <url> [--click <text>]… [--shot <file.png>]');
  process.exit(2);
}

const launch = ['--no-sandbox'];
// The cloud sandbox reaches HTTPS only through its proxy, with TLS 1.2 (cloud-sandbox skill).
if (process.env.HTTPS_PROXY) {
  launch.push(`--proxy-server=${process.env.HTTPS_PROXY}`, '--ssl-version-max=tls1.2');
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: launch,
});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  // The explorer draws a card after fetching its page, so the text is read once every card the address names is drawn.
  const settled = () =>
    page
      .waitForFunction(
        () => {
          const keys = decodeURIComponent(location.hash.slice(1))
            .split(',')
            .filter((key) => /^[a-z]:./.test(key) && !key.startsWith('v:'));
          return keys.every((key) => document.querySelector(`.card[data-key="${CSS.escape(key)}"]`));
        },
        null,
        { timeout: 15_000 },
      )
      .catch(() => {});
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await settled();
  for (const text of clicks) {
    await page.getByText(text, { exact: true }).first().click({ timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await settled();
  }
  if (scroll) {
    await page.locator(scroll).first().scrollIntoViewIfNeeded();
  }
  if (shot) {
    await page.screenshot({ path: shot, fullPage: full });
  }
  const seen = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    links: [...document.querySelectorAll('a, button, [role=button], [data-view], [data-ns], [data-hash]')]
      .map((element) => element.innerText.trim().replace(/\s+/g, ' '))
      .filter((label) => label.length > 0 && label.length < 80),
  }));
  console.log(`URL: ${page.url()}\nTITLE: ${seen.title}\n\nTEXT:\n${seen.text.slice(0, 8000)}`);
  console.log(`\nCLICKABLE (${seen.links.length}):\n${[...new Set(seen.links)].slice(0, 200).join(' | ')}`);
} finally {
  await browser.close();
}
