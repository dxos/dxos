import { chromium } from '@playwright/test';
import { appendFileSync, writeFileSync } from 'node:fs';

const { SHOTS: OUT, VIDEO, LOGFILE: LOG } = process.env;
writeFileSync(LOG, `run ${new Date().toISOString()}\n`);
const log = (...a) => appendFileSync(LOG, a.join(' ') + '\n');

// A fresh context, not a persistent profile: the recording has to show the first-run path a reader
// actually takes, and a reused profile already has the space.
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    '--no-sandbox',
    `--proxy-server=${process.env.HTTPS_PROXY}`,
    '--proxy-bypass-list=127.0.0.1;localhost',
    '--ssl-version-max=tls1.2',
  ],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: VIDEO, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const step = async (n, l) => {
  log(`### ${n} — ${l}`);
  await page.screenshot({ path: `${OUT}/${n}.png` });
};

try {
  log('goto');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 150_000 });
  await page.getByTestId('spacePlugin.addSpace').waitFor({ timeout: 240_000 });
  log('shell up');
  await page.waitForTimeout(5000);
  await page
    .getByTestId('supportPlugin.hideWelcome')
    .click({ timeout: 4000 })
    .catch(() => {});
  await page
    .getByTestId('org.dxos.plugin.observability.notice')
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
  await step('50-composer', 'Composer, dev build');

  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    await page.getByTestId('spacePlugin.addSpace').click();
    await page.waitForTimeout(2500);
    if ((await page.getByTestId('spacePlugin.createSpace').count()) > 0) break;
  }
  await page.getByTestId('spacePlugin.createSpace').click();
  const dialog = page.getByTestId('create-space-dialog');
  await dialog.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  const item = dialog.getByText('Chess MCP on Workers', { exact: false }).first();
  await item.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await step('51-template-listed', 'the template offered in the create-space dialog');
  await item.click();
  await page.waitForTimeout(2500);
  await step('52-template-selected', 'selected — the form takes its name and icon');
  await dialog.getByRole('button', { name: /^Create/ }).click();
  await dialog.waitFor({ state: 'detached', timeout: 60_000 });
  log('dialog closed');
  await page.waitForTimeout(14_000);
  await step('53-space-created', `the seeded space: ${page.url()}`);

  // Walk the seeded content: the plan, the brief, the position.
  for (const [label, name, caption] of [
    ['Ship a chess engine', '54-plan', 'the five-stage plan, every task todo'],
    ['BRIEF.md', '55-brief', 'the brief the plan designs against'],
    ['Test position', '56-board', 'the position the finished server is pointed at'],
  ]) {
    const link = page.getByText(label, { exact: false }).first();
    if ((await link.count()) === 0) {
      log(`!! not on screen: ${label}`);
      continue;
    }
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await link.click({ timeout: 12_000 }).catch((e) => log(`click failed ${label}`));
    await page.waitForTimeout(7000);
    await step(name, caption);
  }
  log('--- ok');
} catch (error) {
  log('!! FAILED:', String(error).slice(0, 400));
  await page.screenshot({ path: `${OUT}/99-failure.png` }).catch(() => {});
}
await context.close();
await browser.close();
log('--- closed; video written');
