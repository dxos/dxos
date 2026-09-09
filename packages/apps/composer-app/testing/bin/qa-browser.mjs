//
// Copyright 2026 DXOS.org
//

// Keeps a headless Chromium page on the QA server so the app boots without a visible pane; the
// agent debug port runs inside this page. Stays alive until killed.
//   node packages/apps/composer-app/testing/bin/qa-browser.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5182/';
// `PW_CHROMIUM_PATH` for a host whose Chromium is not the one Playwright pinned (the cloud sandbox).
// In the sandbox Chromium does not read `HTTPS_PROXY`, and the egress proxy resets its TLS 1.3
// ClientHello, so EDGE is reachable only with the proxy named explicitly and TLS capped at 1.2
// (`cloud-sandbox` skill); loopback bypasses the proxy so the app's own origin stays direct.
const sandboxArgs =
  process.env.CLAUDE_CODE_REMOTE && process.env.HTTPS_PROXY
    ? [
        `--proxy-server=${process.env.HTTPS_PROXY}`,
        '--proxy-bypass-list=127.0.0.1;localhost',
        '--ssl-version-max=tls1.2',
      ]
    : [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: [...(process.env.PW_CHROMIUM_PATH ? ['--no-sandbox'] : []), ...sandboxArgs],
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
