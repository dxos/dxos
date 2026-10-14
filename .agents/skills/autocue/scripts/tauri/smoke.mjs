//
// Copyright 2026 DXOS.org
//

/**
 * Checks `page.mjs` against real WebKitGTK without building the app: WebKitWebDriver drives the stock
 * MiniBrowser on a private Xvfb screen through the same adapter the Tauri target uses, and each gesture is
 * asserted to arrive as a trusted event. Run it after touching the adapter or the selector engine:
 *
 *   node .agents/skills/autocue/scripts/tauri/smoke.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createTauriPage } from './page.mjs';
import { createSession } from './webdriver.mjs';

const MINIBROWSER = [
  '/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser',
  '/usr/lib/webkit2gtk-4.1/MiniBrowser',
].find((candidate) => existsSync(candidate));
if (!MINIBROWSER) {
  console.error('no MiniBrowser: install the libwebkit2gtk-4.1 and webkit2gtk-driver packages');
  process.exit(1);
}

const PAGE = `<html><body style="margin:0">
<input id="name" placeholder="Name">
<button id="go" onclick="document.title = 'clicked:' + event.isTrusted">Go</button>
<div id="editor" contenteditable="true" style="border:1px solid;min-height:20px"></div>
<div id="log"></div>
<script>
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'k') document.getElementById('log').textContent = 'chord:' + event.isTrusted;
  });
  setTimeout(() => {
    const button = document.createElement('button');
    button.dataset.testid = 'late';
    button.textContent = 'Late one';
    document.body.appendChild(button);
  }, 1500);
</script></body></html>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const dir = mkdtempSync(path.join(tmpdir(), 'autocue-smoke-'));
writeFileSync(path.join(dir, 'page.html'), PAGE);

const display = ':151';
const port = 4449;
const xvfb = spawn('Xvfb', [display, '-screen', '0', '1280x800x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
const driver = spawn('WebKitWebDriver', [`--port=${port}`], {
  env: { ...process.env, DISPLAY: display, LIBGL_ALWAYS_SOFTWARE: '1' },
  stdio: 'ignore',
});

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push(ok);
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`,
  );
};

try {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      await fetch(`http://127.0.0.1:${port}/status`).then(
        () => true,
        () => false,
      )
    ) {
      break;
    }
    await sleep(200);
  }
  const session = await createSession(`http://127.0.0.1:${port}`, {
    'webkitgtk:browserOptions': { binary: MINIBROWSER, args: ['--automation'] },
  });
  await session.setTimeouts({ script: 60_000, pageLoad: 60_000, implicit: 0 });
  const page = createTauriPage({ session });
  await page.goto(`file://${path.join(dir, 'page.html')}`);

  await page.locator('#go').click();
  check('click is trusted', await page.evaluate(() => document.title), 'clicked:true');
  await page.locator('input[placeholder="Name"]').fill('hello world');
  check('fill', await page.evaluate(() => document.getElementById('name').value), 'hello world');
  await page.locator('input[placeholder="Name"]').fill('');
  check('fill empty clears', await page.evaluate(() => document.getElementById('name').value), '');
  await page.locator('#editor').pressSequentially('typed', { delay: 20 });
  check('types into contenteditable', await page.locator('#editor').innerText(), 'typed');
  await page.keyboard.press('Control+KeyK');
  check('chord is trusted', await page.locator('#log').innerText(), 'chord:true');
  await page.getByTestId('late').waitFor({ state: 'visible', timeout: 5_000 });
  check('waits for a late element', await page.getByText('Late one', { exact: true }).count(), 1);
  check('has-text is case-insensitive', await page.locator('button:has-text("late")').count(), 1);
  check('string evaluate', await page.evaluate('1 + 2'), 3);
  const missing = await page
    .locator('#missing')
    .click({ timeout: 500 })
    .then(
      () => 'clicked',
      (error) => error.message,
    );
  check('missing target times out', /Timeout 500ms/.test(missing), true);
  await session.close();
} catch (error) {
  checks.push(false);
  console.error(error);
} finally {
  driver.kill();
  xvfb.kill();
  rmSync(dir, { recursive: true, force: true });
}

process.exit(checks.every(Boolean) ? 0 : 1);
