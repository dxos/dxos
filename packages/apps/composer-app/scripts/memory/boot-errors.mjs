// Boots a profile copy against a URL and prints console errors, page errors and whether ready came.
import { chromium } from '@playwright/test';
const [url, profileDir, settle = '60'] = process.argv.slice(2);
// Chromium's own console log reaches workers, which Playwright's page console does not.
const context = await chromium.launchPersistentContext(profileDir, { headless: true, args: ['--enable-logging=stderr', '--v=0'] });
const page = context.pages()[0] ?? (await context.newPage());
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message ?? e).slice(0, 300)}`));
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url().split('/').pop()} ${r.failure()?.errorText}`));
await page.goto(url, { timeout: 120_000 });
const ready = await page.getByTestId('treeView.userAccount').waitFor({ timeout: Number(settle) * 1000 }).then(() => true, () => false);
const scripts = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).length);
console.log(JSON.stringify({ ready, scripts, text: (await page.evaluate(() => document.body.innerText.slice(0, 120))).replace(/\n/g, ' | ') }));
for (const e of [...new Set(errors)]) console.log(e);
await context.close();
