#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Runs an actor-scene story with every actor in its own headless browser, each a real client on the dev EDGE
 * network, and steps them together: the first actor seeds the space and shares an invitation and the scene's target,
 * the rest join with it, then every page seeks to each step and the driver waits for their documents to agree.
 * Reports the join timeline, each step's seek and catch-up time, and whether the documents converged — the
 * counterpart of `probe-scene.mjs`, which runs every actor in one page on an in-memory network.
 *
 *   node solo-scene.mjs --story stories-stories-agent-collaboration--echo [--actors 16] [--step 1000]
 *     [--width 1920 --height 1080] [--join-only] [--catch-up 10000]
 */

import { chromium } from '@playwright/test';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'story': { type: 'string' },
    'url': { type: 'string', default: 'http://localhost:9009' },
    'actors': { type: 'string', default: '16' },
    'step': { type: 'string', default: '1000' },
    'width': { type: 'string', default: '1920' },
    'height': { type: 'string', default: '1080' },
    'join-only': { type: 'boolean', default: false },
    'catch-up': { type: 'string', default: '10000' },
  },
});

const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1_000).toFixed(0)}s`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const count = Number(values.actors);

// Peers on one machine: expose real host candidates rather than mDNS names, and allow loopback.
const CHROMIUM_ARGS = ['--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'];

const open = async (actor) => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: Number(values.width), height: Number(values.height) } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 300)));
  const args = `actor:${actor};stepped:!true`;
  await page.goto(`${values.url}/iframe.html?${new URLSearchParams({ id: values.story, viewMode: 'story', args })}`);
  await page.waitForFunction(() => window.actorScene !== undefined, undefined, { timeout: 300_000 });
  return { actor, browser, page, errors };
};

const status = (page) => page.evaluate(() => window.actorScene?.status);

const host = await open(0);
await host.page.waitForFunction(() => window.actorScene?.shared !== undefined, undefined, { timeout: 300_000 });
const shared = await host.page.evaluate(() => window.actorScene.shared);
console.log(elapsed(), 'host seeded and shared');

const guests = await Promise.all(
  Array.from({ length: count - 1 }, async (_, index) => {
    const guest = await open(index + 1);
    await guest.page.evaluate((shared) => window.actorScene.accept(shared), shared);
    return guest;
  }),
);
const pages = [host, ...guests];
console.log(elapsed(), 'all pages open');

for (;;) {
  const ready = await Promise.all(pages.map(({ page }) => page.evaluate(() => window.grid !== undefined)));
  if (ready.every(Boolean)) {
    break;
  }
  const progress = await Promise.all(pages.map(({ page }) => page.evaluate(() => window.actorScene?.status.progress)));
  console.log(elapsed(), 'joining', JSON.stringify(progress.map((entry) => Object.values(entry ?? {})[0] ?? '-')));
  await sleep(5_000);
}
console.log(elapsed(), 'all joined');

const timelines = await Promise.all(pages.map(({ page }) => page.evaluate(() => window.actorScene.status.timeline)));
const merged = Object.assign({}, ...timelines);
const phases = [...new Set(Object.values(merged).flatMap((marks) => Object.keys(marks)))];
console.log(['actor', ...phases].join('\t'));
for (const [actor, marks] of Object.entries(merged)) {
  console.log([actor, ...phases.map((phase) => marks[phase] ?? '-')].join('\t'));
}

const texts = async () =>
  (await Promise.all(pages.map(({ page }) => page.evaluate(() => window.actorScene.status.texts)))).flat();
const agreed = (all) => all.every((text) => text === all[0]);

if (!values['join-only']) {
  const total = await host.page.evaluate(() => window.grid.total);
  console.log(elapsed(), `stepping ${total}ms`);
  let seeking = 0;
  let catching = 0;
  for (let ms = 0; ms <= total; ms += Number(values.step)) {
    const before = Date.now();
    await Promise.all(pages.map(({ page }) => page.evaluate((ms) => window.grid.seek(ms), ms)));
    const seeked = Date.now();
    seeking += seeked - before;
    // Real time for the network to deliver this step's edits to every page before the next step.
    while (!agreed(await texts()) && Date.now() - seeked < Number(values['catch-up'])) {
      await sleep(50);
    }
    catching += Date.now() - seeked;
    if (ms % 10_000 === 0) {
      const all = await texts();
      const errors = (await Promise.all(pages.map(({ page }) => status(page)))).flatMap((status) => status.errors);
      console.log(
        elapsed(),
        `at ${ms}: seeks ${seeking}ms, catch-up ${catching}ms, ${agreed(all) ? 'agreed' : 'apart'}`,
        `[${all.map((text) => text.length).join(',')}]`,
        errors.length ? JSON.stringify(errors) : '',
      );
      seeking = 0;
      catching = 0;
    }
  }

  // A last wait, so a scene that only lags is told apart from one that never converges.
  const end = Date.now();
  while (!agreed(await texts()) && Date.now() - end < 60_000) {
    await sleep(500);
  }
  const all = await texts();
  const chapters = (text) =>
    text
      .split(/\n(?=## )/)
      .slice(1)
      .map((chapter) => chapter.length)
      .join(',');
  console.log(elapsed(), agreed(all) ? 'converged' : 'NOT converged', `after ${Date.now() - end}ms`);
  console.log(all.map((text) => `${text.length}: ${chapters(text)}`).join('\n'));
  const errors = (await Promise.all(pages.map(({ page }) => status(page)))).flatMap((status) => status.errors);
  console.log('errors', JSON.stringify(errors));
}
console.log('page errors', JSON.stringify(pages.flatMap(({ errors }) => errors).slice(0, 20)));
await Promise.all(pages.map(({ browser }) => browser.close()));
