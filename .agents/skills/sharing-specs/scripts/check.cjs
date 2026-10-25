//
// Copyright 2026 DXOS.org
//

// Serve the packaged directory's PARENT, then: node check.cjs http://localhost:<port>/<dir>/page.html <tab count> <files.json>
// Loads the page in headless Chromium, clicks every tab, waits for the spec editor and for every ```diagram
// fence it reaches to render, opens every side-panel view, fails on a spec under specs/ that did not load or a view
// that crashed, and writes the Artifact `files` map
// of exactly the files the page requested.

const fs = require('node:fs');
const { chromium } = require('@playwright/test');

const [url, tabCount, filesOut] = process.argv.slice(2);

void (async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  // Paths are relative to the page's directory: serve it under a sub-path (as the artifact host does) so a
  // root-relative URL in the bundle fails here too instead of passing by luck.
  const base = new URL('.', url).href;
  const relative = (requestUrl) =>
    requestUrl.startsWith(base)
      ? decodeURIComponent(new URL(requestUrl).pathname.slice(new URL(base).pathname.length))
      : undefined;
  const used = new Set();
  const errors = [];
  const outside = new Set();
  page.on('request', (request) => {
    const path = relative(request.url());
    if (path) {
      used.add(path);
    } else if (request.url().startsWith(new URL(url).origin)) {
      outside.add(new URL(request.url()).pathname);
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  // A spec that fails to load falls back to the bundled text silently, so the check has to fail it.
  const specs = new Map();
  const specPath = (requestUrl) => {
    const path = relative(requestUrl);
    return path?.startsWith('specs/') ? path : undefined;
  };
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
    // Each side-panel view mounts only when opened, so a view that crashes the story shows only when clicked.
    const brokenViews = [];
    const brokenIcons = [];
    const views = page.locator('[data-testid^="spec-article.view."]');
    for (let view = 0; view < (await views.count()); view++) {
      const testId = await views.nth(view).getAttribute('data-testid');
      await views.nth(view).click();
      await page.waitForTimeout(1_500);
      if ((await page.locator('[data-testid="spec-article.panel"]').count()) === 0) {
        brokenViews.push(testId.replace('spec-article.view.', ''));
        await page.locator('#spec-tabs button').nth(tab).click();
        await page.waitForTimeout(3_000);
      }
    }
    if ((await views.count()) > 0) {
      await views.first().click();
    }
    // An icon is `<use href="#id">`; it is blank when its symbol never reached the document.
    await page.waitForTimeout(1_000);
    const missingIcons = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('svg use')]
          .map((use) => use.getAttribute('href') ?? use.getAttribute('xlink:href') ?? '')
          .filter((href) => href.startsWith('#') && !document.getElementById(href.slice(1)))
          .map((href) => href.slice(1)),
      ),
    ]);
    if (missingIcons.length > 0) {
      brokenIcons.push(...missingIcons);
    }
    const label = await page.locator('#spec-tabs button').nth(tab).textContent();
    console.log(
      `tab ${tab + 1} (${label}): diagrams seen ${diagrams}, render errors ${renderErrors.size}, ` +
        `fences without a preview ${unrendered}, broken views ${brokenViews.length ? brokenViews.join(', ') : 'none'}, ` +
        `missing icons ${brokenIcons.length ? brokenIcons.join(', ') : 'none'}` +
        (reachedBottom ? '' : ', stopped before the end of the spec'),
    );
    failed ||=
      renderErrors.size > 0 || unrendered > 0 || !reachedBottom || brokenViews.length > 0 || brokenIcons.length > 0;
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
  // A request outside the page's directory is a root-relative URL, which the artifact host cannot serve.
  console.log(`requests outside the page directory: ${outside.size ? [...outside].join(', ') : 'none'}`);
  failed ||= outside.size > 0;
  console.log(`wrote ${Object.keys(files).length} files to ${filesOut}`);
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
