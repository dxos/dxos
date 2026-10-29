#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Pins Composer's page to exactly 1920x1080 CSS pixels at 2x in an ordinary Chrome window, for recording by hand in
 * Screen Studio. It attaches over Chrome's debugging port (the protocol autocue's driver uses; DevTools never opens)
 * and overrides the page's metrics, so the page renders in the top-left of a larger window and the window's rounded
 * corners and 1px edge fall in empty margin outside it. Crop Screen Studio to 1920x1080 at the page's top-left.
 *
 *   node tools/autocue/showcase/pin.mjs [--url http://localhost:5173] [--width 1920] [--height 1080]
 *
 * It starts Chrome in its own persistent profile (`--profile`, default ~/.dxos/showcase-chrome; your usual Chrome is
 * untouched) with the debugging port open, opens the URL, pins every tab as it opens, and holds the pin until Ctrl-C.
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5173' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    port: { type: 'string', default: '9333' },
    chrome: { type: 'string', default: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    // Chrome refuses the debugging port on the everyday profile, and Composer keeps its spaces in browser storage, so
    // the recording profile persists between sessions: spaces set up once stay there.
    profile: { type: 'string', default: path.join(homedir(), '.dxos', 'showcase-chrome') },
  },
});

const width = Number(options.width);
const height = Number(options.height);
const profile = options.profile;
mkdirSync(profile, { recursive: true });

// The window is a little larger than the page in each direction, so the pinned page never touches its edges.
const chrome = spawn(
  options.chrome,
  [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${options.port}`,
    `--window-size=${width + 80},${height + 200}`,
    '--window-position=0,0',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    options.url,
  ],
  { stdio: 'ignore', detached: true },
);

const connect = async () => {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${options.port}`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Chrome did not open its debugging port ${options.port}`);
};

const browser = await connect();
const [context] = browser.contexts();

/** Pins one tab's page metrics; a navigation keeps the override, so it is set once per tab. */
const pin = async (page) => {
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  });
  const size = await page.evaluate(() => `${innerWidth}x${innerHeight} @${devicePixelRatio}x`).catch(() => '?');
  console.log(`[pin] ${page.url()} -> ${size}`);
};

for (const page of context.pages()) {
  await pin(page);
}
context.on('page', (page) => pin(page).catch((error) => console.error(`[pin] ${error.message}`)));

console.log(`[pin] page pinned to ${width}x${height} at 2x; crop Screen Studio to ${width}x${height} at the page's`);
console.log('[pin] top-left. Leave this running while you record; Ctrl-C releases the pin and closes Chrome.');

const release = async () => {
  await browser.close().catch(() => {});
  try {
    process.kill(-chrome.pid, 'SIGTERM');
  } catch {}
  process.exit(0);
};
process.on('SIGINT', release);
process.on('SIGTERM', release);
chrome.on('exit', () => process.exit(0));
