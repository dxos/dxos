//
// Copyright 2026 DXOS.org
//

// Serve the packaged directory, then: node check.cjs http://localhost:<port>/page.html <tab count> <files.json>
// Loads the page in headless Chromium, clicks every tab, waits for the spec editor and for every ```diagram
// fence it reaches to render, fails on a spec under specs/ that did not load, and writes the Artifact `files` map
// of exactly the files the page requested.

const fs = require('node:fs');
const { chromium } = require('@playwright/test');

const [url, tabCount, filesOut] = process.argv.slice(2);

void (async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const origin = new URL(url).origin;
  const used = new Set();
  const errors = [];
  page.on('request', (request) => {
    if (request.url().startsWith(origin + '/')) {
      used.add(decodeURIComponent(new URL(request.url()).pathname.slice(1)));
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  // A spec that fails to load falls back to the bundled text silently, so the check has to fail it.
  const specs = new Map();
  const specPath = (requestUrl) =>
    requestUrl.startsWith(origin + '/specs/') ? decodeURIComponent(new URL(requestUrl).pathname.slice(1)) : undefined;
  page.on('response', (response) => {
    const path = specPath(response.url());
    if (path) {
      specs.set(path, response.status());
    }
  });
  // A request that never gets a response (refused, aborted) fires no `response` event.
  page.on('requestfailed', (request) => {
    const path = specPath(request.url());
    if (path) {
      specs.set(path, request.failure()?.errorText ?? 'failed');
    }
  });
  await page.goto(url);
  await page.waitForSelector('.cm-editor', { timeout: 60_000 });

  let failed = false;
  for (let tab = 0; tab < Number(tabCount); tab++) {
    await page.locator('#spec-tabs button').nth(tab).click();
    await page.waitForTimeout(3_000);
    // CodeMirror renders only lines near the viewport, so scroll until every diagram has had a chance to mount.
    let diagrams = 0;
    let reachedBottom = false;
    // A diagram scrolled past is unmounted, so its error is collected while it is on screen.
    const renderErrors = new Set();
    // With the selection outside every fence, a fence's opening line is visible only when its preview did not mount.
    let unrendered = 0;
    for (let step = 0; step < 400; step++) {
      diagrams = Math.max(diagrams, await page.locator('.cm-diagram-preview').count());
      for (const text of await page.locator('.cm-diagram-preview-error').allTextContents()) {
        renderErrors.add(text);
      }
      const lines = await page.locator('.cm-line').allTextContents();
      unrendered = Math.max(unrendered, lines.filter((line) => /^```(diagram|dxd)\s*$/.test(line)).length);
      const done = await page.evaluate(() => {
        const scroller = document.querySelector('.cm-scroller');
        scroller.scrollTop += 500;
        return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      });
      await page.waitForTimeout(120);
      if (done) {
        reachedBottom = true;
        break;
      }
    }
    await page.waitForTimeout(2_000);
    for (const text of await page.locator('.cm-diagram-preview-error').allTextContents()) {
      renderErrors.add(text);
    }
    const label = await page.locator('#spec-tabs button').nth(tab).textContent();
    console.log(
      `tab ${tab + 1} (${label}): diagrams seen ${diagrams}, render errors ${renderErrors.size}, ` +
        `fences without a preview ${unrendered}` +
        (reachedBottom ? '' : ', stopped before the end of the spec'),
    );
    failed ||= renderErrors.size > 0 || unrendered > 0 || !reachedBottom;
  }

  const files = {};
  for (const path of [...used].sort()) {
    if (path !== 'page.html') {
      files[path] = path.endsWith('.wasm')
        ? { from: path, contentType: 'application/wasm' }
        : path.endsWith('.mdl')
          ? { from: path, contentType: 'text/plain' }
          : path;
    }
  }
  fs.writeFileSync(filesOut, JSON.stringify(files, null, 2));
  const missing = [...specs].filter(([, status]) => status !== 200).map(([path, status]) => `${path} (${status})`);
  console.log(`specs fetched: ${specs.size}${missing.length ? `, failed: ${missing.join(', ')}` : ''}`);
  failed ||= missing.length > 0;
  console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  console.log(`wrote ${Object.keys(files).length} files to ${filesOut}`);
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
