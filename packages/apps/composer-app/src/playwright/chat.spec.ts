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

/**
 * Deliberately the cheapest possible round trip: a single-token answer whose expected word does not
 * appear in the prompt, so the thread assertion cannot pass on the echoed prompt alone. This suite
 * checks that the chat is wired to the AI service at all — not agent behaviour — so it must never
 * grow a prompt that invites tool use or a long response.
 */
const PROMPT = 'What color is the sky on a clear day? Reply with exactly one word and nothing else.';
const PROMPT_EXCERPT = 'What color is the sky';
const REPLY = /blue/i;

/** A real request to the AI service; well above the config's 10s default for a local assertion. */
const RESPONSE_TIMEOUT = 60_000;

test.describe('Chat', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('sends a message and receives a response', async () => {
    // Boot, space creation and a live model round trip do not fit the default 60s timeout.
    test.slow();

    await host.createSpace();
    await host.createObject({ type: 'Chat' });

    const assistant = new Assistant(Assistant.plank(host.page));
    await expect(assistant.prompt).toBeVisible();

    await assistant.send(PROMPT);

    // Polled over one derived state rather than asserted step by step: a request that never reaches
    // the service leaves the thread empty and surfaces the reason in a toast, so folding the toast,
    // the echoed prompt and the reply into a single value reports which of them actually happened
    // instead of a bare "expected substring" timeout. The toast is latched because it auto-dismisses
    // after 20s — polling for it live would report the post-dismissal state and lose the reason.
    let failure: string | undefined;
    await expect
      .poll(
        async () => {
          if (!failure && (await assistant.error.isVisible())) {
            failure = await assistant.error.innerText();
          }
          if (failure) {
            return `request failed: ${failure}`;
          }
          const thread = await assistant.text();
          if (REPLY.test(thread)) {
            return 'replied';
          }
          return thread.includes(PROMPT_EXCERPT) ? 'prompt echoed, no reply' : 'prompt not echoed';
        },
        { timeout: RESPONSE_TIMEOUT },
      )
      .toBe('replied');
  });
});
