//
// Copyright 2026 DXOS.org
//

// Keeps a headless Chromium page on the QA server so the app boots without a visible pane; the
// agent debug port runs inside this page. Stays alive until killed.
//   node packages/apps/composer-app/testing/bin/qa-browser.mjs [url] [--session <uuid>]
// `--session` re-keys this page's debug port, so several browsers (each its own identity) on one
// server stay individually addressable; the server bakes in a single session for every page.
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const sessionIndex = args.indexOf('--session');
const session = sessionIndex >= 0 ? args.splice(sessionIndex, 2)[1] : undefined;
const url = args[0] ?? 'http://localhost:5182/';
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
if (session) {
  // The `dxos` hook appears only once `client.initialize()` finishes, which on a cold profile trails the mount.
  await page.waitForFunction(() => globalThis.dxos?.debugPort, null, { timeout: 600000 });
  await page.evaluate((session) => {
    globalThis.dxos.debugPort.stop();
    globalThis.dxos.debugPort.start({ session, persist: true });
  }, session);
  console.log(`debug port session: ${session}`);
}
await new Promise(() => {});
