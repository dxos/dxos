#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Opens a stepped actor-scene story headless and reports how its scene gets on: who has joined, every few seconds,
 * then how long each seek takes as it steps to the end, then the final status. For finding where a scene stalls
 * before committing to a frame-by-frame render.
 *
 *   node probe-scene.mjs --story stories-stories-agent-collaboration--echo [--step 1000] [--width 1920 --height 1080]
 *     [--join-only]
 *
 * Once every actor has joined it prints each actor's join timeline (ms since the scene was made at which it reached
 * each phase); `--join-only` stops there.
 */

import { chromium } from '@playwright/test';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'story': { type: 'string' },
    'url': { type: 'string', default: 'http://localhost:9009' },
    'step': { type: 'string', default: '1000' },
    'width': { type: 'string', default: '1920' },
    'height': { type: 'string', default: '1080' },
    'join-only': { type: 'boolean', default: false },
  },
});

const url = `${values.url}/iframe.html?${new URLSearchParams({ id: values.story, viewMode: 'story', args: 'stepped:!true' })}`;
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: Number(values.width), height: Number(values.height) } });
const consoleErrors = new Set();
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleErrors.add(message.text().slice(0, 300));
  }
});
const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1_000).toFixed(0)}s`;
await page.goto(url);

const status = () =>
  page.evaluate(() => {
    const status = window.actorScene?.status;
    return (
      status && {
        phase: status.phase,
        now: status.now,
        registered: status.registered.length,
        progress: status.progress,
        errors: status.errors,
      }
    );
  });

for (;;) {
  const ready = await page.evaluate(() => window.grid !== undefined);
  if (ready) {
    break;
  }
  console.log(elapsed(), JSON.stringify(await status()));
  await page.waitForTimeout(5_000);
}

const timeline = await page.evaluate(() => window.actorScene?.status.timeline ?? {});
const phases = [...new Set(Object.values(timeline).flatMap((marks) => Object.keys(marks)))];
console.log(['actor', ...phases].join('\t'));
for (const [actor, marks] of Object.entries(timeline)) {
  console.log([actor, ...phases.map((phase) => marks[phase] ?? '-')].join('\t'));
}
if (values['join-only']) {
  await browser.close();
  process.exit(0);
}

const total = await page.evaluate(() => window.grid.total);
console.log(elapsed(), `joined; stepping ${total}ms`);
for (let ms = 0; ms <= total; ms += Number(values.step)) {
  const before = Date.now();
  await page.evaluate((ms) => window.grid.seek(ms), ms);
  const took = Date.now() - before;
  if (ms % 10_000 === 0) {
    const { errors = [] } = (await status()) ?? {};
    console.log(elapsed(), `seek ${ms} took ${took}ms`, errors.length ? JSON.stringify(errors) : '');
  }
}
// A last wait, so a scene whose editors only lag is told apart from one that never converges.
const settled = Date.now();
await page
  .waitForFunction(() => window.actorScene?.status.texts.every((text, _, all) => text === all[0]), undefined, {
    timeout: 60_000,
  })
  .catch(() => {});
console.log(elapsed(), `settled for ${Date.now() - settled}ms`);
const final = await page.evaluate(() => {
  const status = window.actorScene?.status;
  const chapters = (text) =>
    text
      .split(/\n(?=## )/)
      .slice(1)
      .map((chapter) => chapter.length)
      .join(',');
  return (
    status && {
      errors: status.errors,
      converged: status.texts.every((text) => text === status.texts[0]),
      text: status.texts[0],
      // Per editor: total length and each chapter's length, to see which writers' text reached whom.
      lengths: status.texts.map((text) => `${text.length}: ${chapters(text)}`),
    }
  );
});
console.log(elapsed(), JSON.stringify({ errors: final?.errors, converged: final?.converged }));
console.log(final?.lengths?.join('\n'));
console.log([...consoleErrors].slice(0, 40).join('\n'));
console.log(final?.text);
await browser.close();
