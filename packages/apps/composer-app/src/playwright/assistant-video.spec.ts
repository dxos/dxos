//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager';
import { Assistant } from './plugins';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

const PROMPT = 'What color is the sky on a clear day? Reply with exactly one word and nothing else.';
const REPLY = /blue/i;

/** A real request to the AI service. */
const RESPONSE_TIMEOUT = 120_000;

/** The chat surface lazy-loads its editor bundle, which in `vite serve` is a per-module request. */
const SURFACE_TIMEOUT = 60_000;

/**
 * Records a real assistant round trip as a `.webm`, for a human to watch rather than a runner to
 * assert on. `chat.spec.ts` is the assertion of the same behaviour; this exists so the run can be
 * shown as evidence.
 *
 * The context is created here rather than taken from the `page` fixture because `AppManager` builds
 * its own page via `setupPage`, which `use.video` does not reach.
 */
test.describe('Assistant', () => {
  test('records a chat round trip', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      recordVideo: { dir: testInfo.outputDir, size: { width: 1280, height: 800 } },
    });

    // Closed in `finally` because the recording is only written out on context close — a failed run is
    // the one whose video is worth watching.
    try {
      const host = new AppManager(context, false);
      await host.init();
      await host.createSpace();
      await host.createObject({ type: 'Chat' });

      const assistant = new Assistant(Assistant.plank(host.page));
      await expect(assistant.prompt).toBeVisible({ timeout: SURFACE_TIMEOUT });

      await assistant.send(PROMPT);
      await expect.poll(async () => REPLY.test(await assistant.text()), { timeout: RESPONSE_TIMEOUT }).toBe(true);

      // Leave the answer on screen long enough to read.
      await host.page.waitForTimeout(3_000);
    } finally {
      await context.close();
      log.info('video recorded', { dir: testInfo.outputDir });
    }
  });
});
