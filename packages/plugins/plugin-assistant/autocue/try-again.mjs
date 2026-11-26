//
// Copyright 2026 DXOS.org
//

/**
 * A request fails because the AI service is unreachable, and "Try again" on the error answers it without sending the
 * prompt a second time.
 *
 * @title Try again
 * @mdl packages/plugins/plugin-assistant/PLUGIN.mdl test QA-7
 * @app storybook via `DX_STORIES=plugins/plugin-assistant,stories/stories-assistant VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps -- --port=9009`, story `stories-stories-assistant-chat-chat--default` (live model on preview EDGE)
 * @driver `--url http://localhost:9009/iframe.html?id=stories-stories-assistant-chat-chat--default&viewMode=story --ready '[data-testid="assistant.prompt"]'`
 */

const SUBTITLE = 'plugin-assistant/PLUGIN.mdl · QA-7';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const ERROR = '[data-testid="assistant.error"]';
const RETRY = '[data-testid="assistant.error.retry"]';
const TEXT = 'In one short sentence, what does local-first software mean?';
// The outage: every request to the AI service is dropped until the step lifts it.
const AI_SERVICE = /^https:\/\/[^/]+\/ai\//;
const ANSWER_TIMEOUT = 90_000;

const blockAi = (route) => route.abort('connectionrefused');

/** How many times the prompt shows in the thread, the composer excluded. */
const promptCount = (page) =>
  page.evaluate((text) => {
    const thread = document.body.innerText.split(text).length - 1;
    const composer = document.querySelector('[data-testid="assistant.prompt"]')?.innerText.split(text).length - 1;
    return thread - (composer ?? 0);
  }, TEXT);

export const steps = [
  {
    name: 'Open a chat on a live model',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Send a prompt while the AI service is unreachable',
    narration: 'The AI service goes down just as a prompt is sent.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Send a prompt while the AI service is unreachable', subtitle: SUBTITLE });
      await page.context().route(AI_SERVICE, blockAi);
      await demo.type({ selector: PROMPT, value: TEXT, delay: 40 });
      await demo.press({ key: 'Enter' });
      await page.locator(RETRY).waitFor({ state: 'visible', timeout: ANSWER_TIMEOUT });
      const count = await promptCount(page);
      if (count !== 1) {
        throw new Error(`the prompt shows ${count} times`);
      }
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Try again',
    narration: 'Once it is back, Try again resumes the turn, and the prompt is not sent twice.',
    run: async ({ demo, page }) => {
      await page.context().unroute(AI_SERVICE, blockAi);
      await demo.caption({ value: 'Restore the AI service and click "Try again"', subtitle: SUBTITLE });
      await demo.click({ selector: RETRY, label: 'Try again' });
      await page.locator(ERROR).waitFor({ state: 'hidden', timeout: 10_000 });
      // The answer is in once the turn ends and the composer accepts a new prompt.
      await page.waitForFunction(
        (text) => {
          const body = document.body.innerText;
          const after = body.slice(body.lastIndexOf(text) + text.length);
          return /local/i.test(after) && after.trim().length > 40;
        },
        TEXT,
        { timeout: ANSWER_TIMEOUT },
      );
      // A streaming prefix passes the check above, so the answer is complete only once the chat model is idle.
      await page.locator('[data-testid="assistant.prompt"][data-active="false"]').waitFor({ timeout: ANSWER_TIMEOUT });
      if (await page.locator(ERROR).isVisible()) {
        throw new Error('the retried turn failed again');
      }
      const count = await promptCount(page);
      if (count !== 1) {
        throw new Error(`the prompt shows ${count} times after retry`);
      }
      await demo.sleep({ ms: 4_000 });
    },
  },
];
